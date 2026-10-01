/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Identidade "Lumi Finance" — hex exatos do guia de marca.
        petroleo: "#1D4A40",
        "petroleo-escuro": "#12302A",
        luz: "#F2B544",
        "luz-escura": "#8A5A0B",
        tinta: "#18221F",
        papel: "#F4F5F2",
        nevoa: "#E5EEEA",
        cinza: "#5B6560",
        receita: "#2B7A53",
        despesa: "#B4473B",
        // Modo escuro: o guia só cobre telas claras. Estes três tons dão
        // fundo/superfície/borda coerentes com a paleta nova e já foram
        // usados (como slate-950/900/800) na versão anterior do app.
        noite: "#0b1712",
        "noite-clara": "#152c24",
        "noite-borda": "#1e3b30",
        // Aliases para quem ainda referenciar os nomes semânticos antigos.
        income: "#2B7A53",
        expense: "#B4473B",
      },
      fontFamily: {
        sans: ["\"Schibsted Grotesk\"", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
