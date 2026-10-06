/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          50: '#FDF8F4',
          100: '#FAF0E6',
          200: '#F4C2C2',
          300: '#D4A5A5',
          400: '#BC8F8F',
          500: '#B8975A',
          600: '#9A7D4A',
          700: '#6B6058',
          800: '#2A2520',
          900: '#1a1714',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        cursive: ['Great Vibes', 'cursive'],
        display: ['DM Serif Display', 'serif'],
        body: ['Josefin Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
