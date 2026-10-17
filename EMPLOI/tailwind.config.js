/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte Agence Elite : noir, rouge (#FB0000 dans le logo) et blanc.
        encre: { 50: '#f6f6f7', 100: '#e8e8ea', 500: '#3f3f46', 600: '#27272a', 700: '#1c1c1f', 800: '#141416', 900: '#0b0b0c' },
        // rouge-600 : rouge du logo assombri juste assez pour un texte blanc lisible (contraste AA).
        rouge: { 50: '#fff1f1', 100: '#ffdede', 200: '#ffc2c2', 300: '#ff7a7a', 400: '#ff4d4d', 500: '#fb0000', 600: '#d90000', 700: '#b00000' },
        ivoire: '#fafafa',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'], titre: ['Montserrat', 'Inter', 'sans-serif'] },
      boxShadow: { carte: '0 1px 2px rgba(11,11,12,.05), 0 10px 28px -14px rgba(11,11,12,.22)' },
    },
  },
  plugins: [],
}
