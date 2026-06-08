/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wrestling-red': '#cc0000',
        'wrestling-grey': '#333333',
        'wrestling-silver': '#c0c0c0',
      }
    },
  },
  plugins: [],
}
