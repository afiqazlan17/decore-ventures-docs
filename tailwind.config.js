/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        terracotta: "#C15B42",
        blush: "#E8927C",
        cream: "#FBF3EC",
        ink: "#2B2420",
        gold: "#D9A566",
      },
    },
  },
  plugins: [],
};
