/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        'brand-black': '#060606',
        'brand-grey': '#282828',
        'brand-purple': '#C63AEB',
        'brand-white': '#FFFFFF',
        'app-bg': '#F2F4F8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Bodoni Moda"', 'serif'],
        pixel: ['"Press Start 2P"', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'check': 'check 0.5s ease-in-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        check: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
