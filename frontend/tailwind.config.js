/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        income: "#16a34a",
        expense: "#dc2626",
        // Paleta neutra com leve matiz verde-petróleo, substitui o cinza puro
        // do Tailwind — todo o app já usa `slate-*` como cor base, então
        // retintar aqui aplica o novo visual em todas as telas de uma vez.
        slate: {
          50: "#f6f5f0",
          100: "#eae8e0",
          200: "#d6d9d0",
          300: "#b8c2b8",
          400: "#8ea092",
          500: "#66806c",
          600: "#4a6350",
          700: "#38493c",
          800: "#1e3b30",
          900: "#152c24",
          950: "#0b1712",
        },
      },
      fontFamily: {
        sans: ["\"Schibsted Grotesk\"", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
