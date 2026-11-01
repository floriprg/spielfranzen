/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          dark: '#0c2317',
          felt: '#134e2c',
          light: '#1e6b3e',
          accent: '#2f855a',
        },
        card: {
          border: '#e2e8f0',
          bg: '#ffffff',
          gold: '#d97706',
          eichel: '#854d0e',
          laub: '#15803d',
          schell: '#b45309',
          herz: '#b91c1c',
        }
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 12px 20px -3px rgba(0, 0, 0, 0.35), 0 4px 8px -2px rgba(0, 0, 0, 0.2)',
        'felt': 'inset 0 0 100px rgba(0,0,0,0.6)',
      }
    },
  },
  plugins: [],
}
