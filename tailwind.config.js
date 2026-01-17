// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { 
        brand: { DEFAULT: '#2563eb', dark: '#1e40af' },
        green: { 
          DEFAULT: '#16a34a', // tailwindcss green-600
          dark: '#15803d' // tailwindcss green-700
        } 
      },
      borderRadius: { '2xl': '1.25rem' }
    }
  },
  darkMode: 'class',
  plugins: []
}