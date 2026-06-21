/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        senior: {
          deep: '#1a4a3a',
          gold: '#c9a84c',
          cream: '#f5f0e8',
          text: '#2d2d2d',
        },
        maman: {
          rose: '#e8b4b8',
          soft: '#fce4ec',
          warm: '#f8e8e0',
          text: '#4a2c2c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};