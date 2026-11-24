/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sportup: {
          primary: '#FF6B35',
          secondary: '#2AB7CA',
          tertiary: '#FED766',
          bg: '#0D1B2A',
          surface: '#1B263B',
          elevated: '#283953',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
