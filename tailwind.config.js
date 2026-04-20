/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        ink:    '#1a1a2e',
        paper:  '#f5f0e8',
        accent: '#c84b31',
        muted:  '#8a7f72',
        border: '#d4cdc4',
        success:'#2d7a4f',
        warn:   '#b45309',
      }
    }
  },
  plugins: []
}
