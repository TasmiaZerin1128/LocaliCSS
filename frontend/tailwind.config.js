/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      title: ['Montserrat', 'sans-serif'],
      body: ['Open Sans', 'serif'],
    },
    extend: {
      colors: {
        'primary': '#A8509E',
      },
    },
  },
  plugins: [],
}

