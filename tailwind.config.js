export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      colors:{
        lila:{
          primary: "#7e3565",
          text:"#828282",
        },
      },
    },
  },
  plugins: [],
}
