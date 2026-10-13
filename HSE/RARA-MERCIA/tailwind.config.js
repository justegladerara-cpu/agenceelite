/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marine: { 50: '#eef3fa', 100: '#d6e2f2', 500: '#2c5d97', 600: '#1f4a7d', 700: '#173a63', 800: '#0f2a4a', 900: '#0a1d34' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'] },
      boxShadow: { carte: '0 1px 2px rgba(15,42,74,.06), 0 8px 24px -12px rgba(15,42,74,.18)' },
    },
  },
  plugins: [],
}
