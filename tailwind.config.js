/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#101723",
        panel: "#162030",
        line: "#2a3648",
        accent: "#f7b267",
        signal: "#7ad9ff",
        ember: "#ff8a65"
      },
      boxShadow: {
        cockpit: "0 30px 90px rgba(7, 14, 24, 0.34)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};
