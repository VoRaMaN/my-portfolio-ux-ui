"""Browser runtime for pygame games (runs inside Pyodide).

Desktop pygame games block in a `while running:` loop, which would freeze a browser tab.
prepare() analyses the uploaded project and run() executes it with these rewrites, applied
in memory at import time (the original files stay untouched, so tracebacks keep their real
line numbers):

* functions that contain a game loop (a while-loop that polls events, draws, or ticks a
  Clock - directly or through the functions it calls) become `async`, and so does every
  function that calls one of them
* calls to those functions are awaited (safely: non-awaitables pass straight through)
* each game-loop iteration yields to the browser so it can draw the frame and deliver input
* Clock.tick(fps) paces frames with asyncio.sleep; time.sleep, pygame.time.wait/delay and
  pygame.event.wait become non-blocking
* sprite update()/draw() methods and other methods pygame calls itself are never made async
"""
import ast
import asyncio
import copy
import importlib.machinery
import inspect
import json
import os
import re
import sys
import time

SKIP_DIRS = {'__pycache__', 'venv', '.venv', 'env', '.git', 'build', 'dist', 'site-packages', '__MACOSX'}
NEVER_ASYNC = {'__init__', '__new__', '__del__', '__enter__', '__exit__', '__repr__', '__str__', '__eq__',
               '__hash__', '__len__', '__iter__', '__next__', '__getattr__', '__getattribute__', '__setattr__',
               '__call__', '__getitem__', '__setitem__', '__contains__', '__bool__', '__lt__', '__gt__'}
SPRITE_BASES = {'Sprite', 'DirtySprite', 'Group', 'RenderUpdates', 'LayeredUpdates', 'GroupSingle'}
INTERACT = {'event', 'display', 'tick', 'event_wait'}

STATE = {'root': None, 'main': None, 'project': None, 'window': False}


# --------------------------------------------------------------------- analysis
def _chain(node):
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        parts.append(node.id)
    else:
        parts.append('?')
    return parts[::-1]


def call_kind(call):
    """Classify a call: event / display / tick / sleep / wait_ms / event_wait / aiorun / None."""
    if not isinstance(call.func, (ast.Attribute, ast.Name)):
        return None
    c = _chain(call.func)
    last, owner = c[-1], (c[-2] if len(c) > 1 else None)
    if owner == 'event' and last == 'wait':
        return 'event_wait'
    if owner == 'event' and last in ('get', 'poll', 'pump', 'peek'):
        return 'event'
    if owner in ('key', 'mouse') and last == 'get_pressed':
        return 'event'
    if owner == 'display' and last in ('flip', 'update'):
        return 'display'
    if last in ('tick', 'tick_busy_loop') and len(c) > 1:
        return 'tick'
    if c == ['time', 'sleep'] or c == ['sleep']:
        return 'sleep'
    if owner == 'time' and last in ('wait', 'delay') and len(c) > 2:
        return 'wait_ms'
    if c == ['asyncio', 'run']:
        return 'aiorun'
    return None


def walk_own(nodes):
    """Walk statements/expressions without entering nested functions, lambdas or classes."""
    stack = list(nodes)
    while stack:
        n = stack.pop()
        yield n
        for ch in ast.iter_child_nodes(n):
            if not isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
                stack.append(ch)


class Func:
    def __init__(self, node, cls, path):
        self.node, self.cls, self.path, self.name = node, cls, path, node.name
        self.calls = []          # (kind, name): kind 'self' (self.m()), 'name' (f()), 'attr' (obj.m())
        self.direct_interact = False
        self.blocking = False
        self.loop = False
        self.is_gen = False
        for n in walk_own(node.body):
            if isinstance(n, (ast.Yield, ast.YieldFrom)):
                self.is_gen = True
            if isinstance(n, ast.Call):
                k = call_kind(n)
                if k in INTERACT:
                    self.direct_interact = True
                if k in ('sleep', 'wait_ms', 'event_wait'):
                    self.blocking = True
                f = n.func
                if k is not None or (isinstance(f, (ast.Attribute, ast.Name)) and _chain(f)[0] == 'pygame'):
                    continue
                if isinstance(f, ast.Name):
                    self.calls.append(('name', f.id))
                elif isinstance(f, ast.Attribute):
                    if isinstance(f.value, ast.Name) and f.value.id in ('self', 'cls'):
                        self.calls.append(('self', f.attr))
                    else:
                        self.calls.append(('attr', f.attr))


class Project:
    def __init__(self, root):
        self.root = root
        self.trees, self.funcs, self.errors = {}, [], []
        for dirpath, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
            for f in files:
                if f.endswith('.py'):
                    p = os.path.join(dirpath, f)
                    try:
                        with open(p, encoding='utf-8', errors='replace') as fh:
                            self.trees[p] = ast.parse(fh.read(), p)
                    except SyntaxError as e:
                        self.errors.append(f'{os.path.relpath(p, root)}: {e.msg} (line {e.lineno})')
        for p, tree in self.trees.items():
            self._collect(tree.body, None, p)
        self.by_name = {}
        for fn in self.funcs:
            self.by_name.setdefault(fn.name, []).append(fn)
        self._analyse()

    def _collect(self, body, cls, path):
        for n in body:
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.funcs.append(Func(n, cls, path))
                self._collect(n.body, None, path)
            elif isinstance(n, ast.ClassDef):
                self._collect(n.body, n, path)
            elif hasattr(n, 'body') and isinstance(getattr(n, 'body'), list):
                self._collect(n.body, cls, path)
                for extra in ('orelse', 'finalbody', 'handlers'):
                    self._collect(getattr(n, extra, []) or [], cls, path)

    def _resolve(self, fn, kind, name):
        if kind == 'self' and fn.cls is not None:
            own = [g for g in self.by_name.get(name, []) if g.cls is fn.cls]
            if own:
                return own
        return self.by_name.get(name, [])

    def _sprite_method(self, fn):
        if fn.cls is None or fn.name not in ('update', 'draw'):
            return False
        return any(_chain(b)[-1] in SPRITE_BASES for b in fn.cls.bases if isinstance(b, (ast.Name, ast.Attribute)))

    def _loop_is_game(self, loop, interactive_names):
        for n in walk_own(loop.body):
            if isinstance(n, ast.Call):
                if call_kind(n) in INTERACT:
                    return True
                f = n.func
                nm = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else None)
                if nm in interactive_names:
                    return True
        return False

    def _analyse(self):
        # 1) "interactive" functions touch pygame input/display directly or through what they call
        inter = {fn for fn in self.funcs if fn.direct_interact}
        changed = True
        while changed:
            changed = False
            for fn in self.funcs:
                if fn not in inter and any(g in inter for k, nm in fn.calls for g in self._resolve(fn, k, nm)):
                    inter.add(fn)
                    changed = True
        self.interactive_names = {fn.name for fn in inter}
        # 2) functions that contain a game loop or a blocking call must become async
        for fn in self.funcs:
            fn.loop = any(isinstance(n, ast.While) and self._loop_is_game(n, self.interactive_names) for n in walk_own(fn.node.body))

        def eligible(fn):
            return not fn.is_gen and fn.name not in NEVER_ASYNC and not self._sprite_method(fn)

        asyncs = {fn for fn in self.funcs if isinstance(fn.node, ast.AsyncFunctionDef)}
        asyncs |= {fn for fn in self.funcs if (fn.loop or fn.blocking) and eligible(fn)}
        changed = True
        while changed:
            changed = False
            for fn in self.funcs:
                if fn not in asyncs and eligible(fn) and any(g in asyncs for k, nm in fn.calls for g in self._resolve(fn, k, nm)):
                    asyncs.add(fn)
                    changed = True
        for fn in asyncs:
            fn.node._pyrun_async = True
        self.async_names = {fn.name for fn in asyncs}
        self.report = sorted({f'{os.path.relpath(fn.path, self.root)}: {(fn.cls.name + ".") if fn.cls else ""}{fn.name}()'
                              for fn in asyncs if not isinstance(fn.node, ast.AsyncFunctionDef)})
        self.loop_in_init = sorted({f'{os.path.relpath(fn.path, self.root)}: {fn.cls.name if fn.cls else ""}.{fn.name}()'
                                    for fn in self.funcs if fn.loop and fn.name in NEVER_ASYNC})

    # ---------------------------------------------------------------- transform
    def transform(self, path, is_main):
        tree = copy.deepcopy(self.trees[path])   # never rewrite the analysed tree in place
        tr = _Transformer(self, is_main)
        tree = tr.visit(tree)
        if tr.changed:
            names = ['__pyrun_tick__', '__pyrun_sleep__', '__pyrun_wait_ms__', '__pyrun_event_wait__', '__pyrun_maybe__', '__pyrun_frame__']
            imp = ast.ImportFrom(module='__pyrun__', names=[ast.alias(n) for n in names], level=0)
            at = 0
            body = tree.body
            if body and isinstance(body[0], ast.Expr) and isinstance(getattr(body[0], 'value', None), ast.Constant) and isinstance(body[0].value.value, str):
                at = 1
            while at < len(body) and isinstance(body[at], ast.ImportFrom) and body[at].module == '__future__':
                at += 1
            ast.copy_location(imp, body[at] if at < len(body) else tree)
            body.insert(at, imp)
        ast.fix_missing_locations(tree)
        return tree


def _await(fn_name, args, keywords, like):
    call = ast.Call(func=ast.Name(fn_name, ast.Load()), args=args, keywords=keywords)
    return ast.copy_location(ast.Await(ast.copy_location(call, like)), like)


class _Transformer(ast.NodeTransformer):
    def __init__(self, project, is_main):
        self.p = project
        self.ctx = [is_main]  # module level of the main file may use top-level await
        self.changed = False

    def _scoped(self, node, is_async):
        self.ctx.append(is_async)
        self.generic_visit(node)
        self.ctx.pop()
        return node

    def visit_FunctionDef(self, node):
        make = getattr(node, '_pyrun_async', False)
        self._scoped(node, make)
        if not make:
            return node
        self.changed = True
        kw = dict(name=node.name, args=node.args, body=node.body, decorator_list=node.decorator_list, returns=node.returns)
        if hasattr(node, 'type_params'):
            kw['type_params'] = node.type_params
        return ast.copy_location(ast.AsyncFunctionDef(**kw), node)

    def visit_AsyncFunctionDef(self, node):
        return self._scoped(node, True)

    def visit_Lambda(self, node):
        return self._scoped(node, False)

    def visit_ClassDef(self, node):
        return self._scoped(node, False)

    def visit_GeneratorExp(self, node):
        return self._scoped(node, False)

    def visit_Await(self, node):
        if isinstance(node.value, ast.Call):
            node.value._pyrun_skip = True
        self.generic_visit(node)
        return node

    def visit_While(self, node):
        self.generic_visit(node)
        if self.ctx[-1] and self.p._loop_is_game(node, self.p.interactive_names):
            node.body.insert(0, ast.copy_location(ast.Expr(_await('__pyrun_frame__', [], [], node)), node))
            self.changed = True
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if not self.ctx[-1] or getattr(node, '_pyrun_skip', False):
            return node
        k = call_kind(node)
        if k == 'tick':
            self.changed = True
            return _await('__pyrun_tick__', [node.func.value, *node.args], node.keywords, node)
        if k == 'sleep':
            self.changed = True
            return _await('__pyrun_sleep__', node.args, node.keywords, node)
        if k == 'wait_ms':
            self.changed = True
            return _await('__pyrun_wait_ms__', node.args, node.keywords, node)
        if k == 'event_wait':
            self.changed = True
            return _await('__pyrun_event_wait__', node.args, node.keywords, node)
        if k == 'aiorun' and node.args:
            self.changed = True
            return _await('__pyrun_maybe__', [node.args[0]], [], node)
        f = node.func
        nm = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else None)
        if k is None and nm in self.p.async_names:
            self.changed = True
            return _await('__pyrun_maybe__', [node], [], node)
        return node


# ------------------------------------------------------------- runtime helpers
_last_yield = [0.0]
_paced_at = [0.0]   # last time Clock.tick()/sleep() paced the loop
_clock_last = {}


async def __pyrun_maybe__(x):
    if inspect.isawaitable(x):
        return await x
    return x


async def __pyrun_frame__():
    """Runs at the top of every game-loop iteration.

    Loops paced by Clock.tick()/time.sleep() already yield there, so this only makes sure the
    browser still gets a turn. Loops with no pacing at all are capped at 60 fps (like vsync on a
    desktop) instead of spinning thousands of times a second.
    """
    now = time.perf_counter()
    since = now - _last_yield[0]
    if now - _paced_at[0] < 0.25:
        if since > 0.05:
            await asyncio.sleep(0)
            _last_yield[0] = time.perf_counter()
        return
    wait = 1 / 60 - since
    await asyncio.sleep(wait if wait > 0 else 0)
    _last_yield[0] = time.perf_counter()


async def __pyrun_tick__(obj, *args, **kw):
    import pygame
    if isinstance(obj, pygame.time.Clock):
        fps = args[0] if args else kw.get('framerate', 0)
        prev = _clock_last.get(id(obj))
        if fps and prev is not None:
            wait = prev + 1.0 / fps - time.perf_counter()
            await asyncio.sleep(wait if wait > 0 else 0)
        else:
            await asyncio.sleep(0)
        _clock_last[id(obj)] = _last_yield[0] = _paced_at[0] = time.perf_counter()
        return obj.tick()  # no framerate: returns the real ms since the previous frame
    r = obj.tick(*args, **kw)
    return await __pyrun_maybe__(r)


async def __pyrun_sleep__(seconds=0, *a, **k):
    await asyncio.sleep(max(0.0, float(seconds)))
    _last_yield[0] = _paced_at[0] = time.perf_counter()


async def __pyrun_wait_ms__(ms=0, *a, **k):
    await asyncio.sleep(max(0.0, float(ms) / 1000.0))
    _last_yield[0] = _paced_at[0] = time.perf_counter()
    return int(ms)


async def __pyrun_event_wait__(timeout=0, *a, **k):
    import pygame
    start = time.perf_counter()
    while True:
        ev = pygame.event.poll()
        if ev.type != pygame.NOEVENT:
            return ev
        if timeout and (time.perf_counter() - start) * 1000 >= timeout:
            return pygame.event.Event(pygame.NOEVENT)
        await asyncio.sleep(1 / 120)
        _last_yield[0] = time.perf_counter()


# ---------------------------------------------------------------- import hook
class _Loader(importlib.machinery.SourceFileLoader):
    def source_to_code(self, data, path, *, _optimize=-1):
        proj = STATE['project']
        if proj is not None and path in proj.trees:
            return compile(proj.transform(path, False), path, 'exec', dont_inherit=True)
        return super().source_to_code(data, path)


def _install_hook(root):
    def hook(entry):
        if os.path.abspath(entry).startswith(root):
            return importlib.machinery.FileFinder(entry, (_Loader, importlib.machinery.SOURCE_SUFFIXES))
        raise ImportError('not a game path')
    sys.path_hooks.insert(0, hook)
    sys.path_importer_cache.clear()
    sys.dont_write_bytecode = True


# ------------------------------------------------------------------ finding the start file
# Projects arrive straight from an editor: PyCharm's sample main.py, a venv, tests, and modules such as
# fighter.py (class Fighter) sit next to the real game script. So rather than trusting a file name, every
# .py file is scored. The start file is one no other file imports, that opens the window (set_mode) itself
# or through what it imports, and that actually runs code at the top level.
IDE_SAMPLES = ('This is a sample Python script', "print_hi('PyCharm')")
RUN_NAMES = {'main', '__main__', 'game', 'run', 'app', 'play', 'start', 'launcher'}
TESTISH = re.compile(r'^(test_.*|.*_test|tests?|conftest|setup)$', re.I)
WINDOW = re.compile(r'\bset_mode\s*\(')


def _norm(s):
    s = re.sub(r'[^a-z0-9]', '', str(s).lower())
    return re.sub(r'(v?\d+)+$', '', s) or s      # "PyFighter V1" → "pyfighter"


def _py_files(base, skip=True, read=True):
    out = {}
    for dirpath, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d != '__MACOSX' and not (skip and (d in SKIP_DIRS or d.startswith('.'))))
        for f in sorted(files):
            if f.endswith('.py') and not f.startswith('._'):
                p = os.path.join(dirpath, f)
                if not read:
                    out[p] = ''
                    continue
                try:
                    with open(p, encoding='utf-8', errors='replace') as fh:
                        out[p] = fh.read()
                except OSError:
                    pass
    return out


def _imported_names(src):
    names = set()
    try:
        tree = ast.parse(src)
    except SyntaxError:
        for m in re.finditer(r'^\s*(?:from\s+([\w.]+)\s+import\s+([\w, ]+)|import\s+([\w., ]+))', src, re.M):
            for grp in m.groups():
                if grp:
                    names.update(x for x in re.split(r'[.,\s]+', grp) if x)
        return names, None
    for n in ast.walk(tree):
        if isinstance(n, ast.Import):
            for a in n.names:
                names.update(a.name.split('.'))
        elif isinstance(n, ast.ImportFrom):
            if n.module:
                names.update(n.module.split('.'))
            names.update(a.name for a in n.names)
    return names, tree


def _runs_code(tree):
    """True when running the file does something beyond defining functions, classes and constants."""
    for n in tree.body:
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom, ast.Pass)):
            continue
        if isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant):
            continue
        if isinstance(n, (ast.Assign, ast.AnnAssign, ast.AugAssign)) and not any(isinstance(x, ast.Call) for x in ast.walk(n)):
            continue
        return True
    return False


def rank_entries(base, hint=None):
    """All candidate start files, best first, as (score, path)."""
    files = _py_files(base)
    hints = {h for h in (_norm(os.path.splitext(x)[0]) for x in (hint if isinstance(hint, (list, tuple)) else [hint]) if x) if h}
    info, mods = {}, {}
    for p, src in files.items():
        names, tree = _imported_names(src)
        stem = os.path.splitext(os.path.basename(p))[0]
        mod = os.path.basename(os.path.dirname(p)) if stem == '__init__' else stem
        test = bool(TESTISH.match(stem)) or any(TESTISH.match(x) for x in os.path.relpath(p, base).split(os.sep)[:-1])
        info[p] = {'names': names, 'tree': tree, 'stem': stem, 'src': src, 'test': test}
        mods.setdefault(mod, []).append(p)
    imported = set()
    for p, d in info.items():
        if d['test']:
            continue                               # a test importing the game doesn't make the game a module
        for nm in d['names']:
            imported.update(q for q in mods.get(nm, ()) if q != p)

    def reaches_window(p):
        seen, todo = {p}, [p]
        while todo:
            cur = todo.pop()
            if WINDOW.search(info[cur]['src']):
                return True
            for nm in info[cur]['names']:
                for q in mods.get(nm, ()):
                    if q not in seen:
                        seen.add(q); todo.append(q)
        return False

    scored = []
    for p, d in info.items():
        src, stem, s = d['src'], d['stem'], 0
        if p in imported:
            s -= 1000                              # e.g. fighter.py: the game imports its Fighter class
        if WINDOW.search(src):
            s += 120
        elif reaches_window(p):
            s += 100
        if re.search(r'^\s*(?:import|from)\s+pygame\b', src, re.M):
            s += 20
        if d['tree'] is not None and _runs_code(d['tree']):
            s += 30
        if re.search(r'^\s*while\b', src, re.M):
            s += 10
        if re.search(r'''__name__\s*==\s*['"]__main__['"]''', src):
            s += 10
        if stem.lower() in RUN_NAMES:
            s += 15
        n = _norm(stem)
        if n and (n in hints or (len(n) >= 4 and any(len(h) >= 4 and (h.startswith(n) or n.startswith(h)) for h in hints))):
            s += 40                                # PyFighter.py in "PyFighter V1.zip"
        if d['test']:
            s -= 200
        if any(t in src for t in IDE_SAMPLES):
            s -= 300                               # PyCharm's "sample Python script" main.py
        s -= 4 * os.path.relpath(p, base).count(os.sep)
        scored.append((s, p))
    scored.sort(key=lambda x: (-x[0], x[1].count(os.sep), x[1].lower()))
    return scored


def find_entry(base, entry='', hint=None, ranked=None):
    """Locate the start file inside the unpacked project (zips often wrap everything in one folder)."""
    ranked = rank_entries(base, hint) if ranked is None else ranked
    if entry:
        files = _py_files(base, skip=False, read=False)
        rel = lambda p: '/' + os.path.relpath(p, base).replace(os.sep, '/')
        want = '/' + entry.replace('\\', '/').strip().strip('/')
        if not want.endswith('.py'):
            want += '.py'
        hits = [p for p in files if rel(p).endswith(want)] or [p for p in files if rel(p).lower().endswith(want.lower())]
        if hits:
            return min(hits, key=lambda p: p.count(os.sep))
        found = ', '.join(sorted(os.path.relpath(p, base).replace(os.sep, '/') for _, p in ranked)[:12]) or 'none'
        raise FileNotFoundError(f'The start file "{entry}" is not in the .zip. Python files in it: {found}. '
                                'Fix the name in the admin (Play in browser → Start file), or clear it to detect the start file automatically.')
    if not ranked:
        raise FileNotFoundError(_no_python(base))
    return ranked[0][1]


def _files_like(base, exts):
    out = []
    for dirpath, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d != '__MACOSX')
        out += [os.path.relpath(os.path.join(dirpath, f), base).replace(os.sep, '/') for f in sorted(files) if f.lower().endswith(exts) and not f.startswith('._')]
    return out


def _no_python(base):
    """Why a zip with no .py files can't run — usually a packaged .exe build or an archive inside the archive."""
    exes = _files_like(base, ('.exe', '.app', '.apk', '.x86_64'))
    packs = _files_like(base, ('.rar', '.7z', '.zip'))
    if exes:
        return (f'This .zip has no Python source files: it holds a packaged build ({os.path.basename(exes[0])}), and browsers can\'t run .exe files. '
                'Zip the game\'s source folder instead: its .py files plus the folders they load images and sounds from (e.g. Assets).')
    if packs:
        return (f'This .zip has no Python files, only another archive ({os.path.basename(packs[0])}). '
                'Unpack it, then zip the game\'s source folder: its .py files plus the folders they load images and sounds from.')
    return 'This .zip has no Python (.py) files. Zip the game\'s source folder: its .py files plus the folders they load images and sounds from.'


def prepare(base, entry='', hint=None):
    ranked = rank_entries(base, hint)
    main = os.path.abspath(find_entry(base, entry, hint, ranked))
    root = os.path.dirname(main)
    proj = Project(root)
    STATE.update(root=root, main=main, project=proj, window=False)
    others = [os.path.relpath(p, base) for _, p in ranked if os.path.abspath(p) != main][:4]
    return json.dumps({
        'entry': os.path.relpath(main, base),
        'chosen': 'set' if entry else 'auto',
        'others': others,
        'files': len(proj.trees),
        'archives': _files_like(base, ('.rar', '.7z', '.zip'))[:3],
        'converted': proj.report,
        'warnings': proj.errors + [f'Game loop inside {x} cannot be converted (may freeze)' for x in proj.loop_in_init],
    })


def _patch_pygame():
    import pygame
    real_set_mode = pygame.display.set_mode

    def set_mode(size=(0, 0), flags=0, *a, **k):
        try:
            w, h = size
        except Exception:
            w, h = 0, 0
        if not w or not h:
            size = (1280, 720)
        flags &= ~getattr(pygame, 'FULLSCREEN', 0)   # the page's own Fullscreen button handles this
        STATE['window'] = True
        return real_set_mode(size, flags, *a, **k)
    pygame.display.set_mode = set_mode

    real_caption = pygame.display.set_caption

    def set_caption(title, *a, **k):
        try:
            import js
            js.window.parent.postMessage(js.JSON.parse(json.dumps({'type': 'pyrun:title', 'title': str(title)})), '*')
        except Exception:
            pass
        return real_caption(title, *a, **k)
    pygame.display.set_caption = set_caption

    # Audio is optional: if the mixer can't start, swap in silent stand-ins so the game still runs.
    try:
        pygame.mixer.init()
    except Exception as e:
        print(f'[pyrun] audio unavailable ({e}); running silently')

        class _Silent:
            def __init__(self, *a, **k): pass
            def __getattr__(self, name): return lambda *a, **k: None
            def get_length(self): return 0.0
            def get_num_channels(self): return 0
            def get_volume(self): return 0.0

        class _Music:
            def __getattr__(self, name): return lambda *a, **k: None
            def get_busy(self): return False
            def get_pos(self): return -1
            def get_volume(self): return 0.0

        pygame.mixer.Sound = _Silent
        pygame.mixer.Channel = _Silent
        pygame.mixer.music = _Music()
        for fn in ('init', 'pre_init', 'quit', 'stop', 'pause', 'unpause', 'fadeout', 'set_num_channels', 'set_reserved'):
            setattr(pygame.mixer, fn, lambda *a, **k: None)
        pygame.mixer.get_init = lambda: None
        pygame.mixer.find_channel = lambda *a, **k: _Silent()
        pygame.mixer.get_busy = lambda: False


async def run():
    """Execute the prepared game. Returns 'exit' when the game quits normally."""
    main, root, proj = STATE['main'], STATE['root'], STATE['project']
    os.chdir(root)
    if root not in sys.path:
        sys.path.insert(0, root)
    _install_hook(root)
    _patch_pygame()
    tree = proj.transform(main, True)
    code = compile(tree, main, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)
    g = {'__name__': '__main__', '__file__': main, '__builtins__': __builtins__}
    try:
        res = eval(code, g)
        if inspect.iscoroutine(res):
            await res
    except SystemExit:
        pass
    try:
        import pygame
        pygame.quit()
    except Exception:
        pass
    return 'exit'
