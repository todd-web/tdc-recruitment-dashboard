/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tdc: {
          gold: '#C5A572',
          'gold-light': '#D4B896',
          'gold-dark': '#A88B5E',
          'gold-glow': '#E8D5B0',
          black: '#1A1A1A',
          'black-light': '#2A2A2A',
          'gray-dark': '#333333',
          'gray-mid': '#555555',
          'gray-light': '#888888',
          white: '#FFFFFF',
          'off-white': '#F5F0E8',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
