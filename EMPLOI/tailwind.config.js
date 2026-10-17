/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Repris de la charte SAS Congo : marine et doré, avec un bordeaux pour les actions.
        marine: { 50: '#eef4f7', 100: '#d5e3ea', 500: '#2b5a6e', 600: '#1d4556', 700: '#163746', 800: '#102c39', 900: '#0b202b' },
        dore: { 100: '#f6ecdc', 400: '#e2c393', 500: '#d9b37a', 600: '#c39a5c' },
        bordeaux: { 50: '#fbeef1', 600: '#930529', 700: '#7a0422' },
        ivoire: '#f7f6f2',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'], titre: ['Manrope', 'Inter', 'sans-serif'] },
      boxShadow: { carte: '0 1px 2px rgba(16,44,57,.06), 0 8px 24px -12px rgba(16,44,57,.18)' },
    },
  },
  plugins: [],
}
