/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0a0a0f',
          secondary: '#111118',
          card: '#16161f',
          border: '#1e1e2e'
        },
        accent: {
          primary: '#5B4FE8',
          secondary: '#0EA47A',
          danger: '#E85B4F',
          warning: '#E8A84F'
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#8888a0',
          muted: '#555568'
        }
      }
    },
  },
  plugins: [],
}
