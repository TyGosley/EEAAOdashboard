/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#081a2a',
        steel: '#0f2f44',
        glow: '#27d4ff',
        ember: '#ff9640'
      },
      fontFamily: {
        display: ['"Rajdhani"', 'sans-serif'],
        body: ['"Exo 2"', 'sans-serif']
      },
      boxShadow: {
        neon: '0 0 22px rgba(39, 212, 255, 0.24)',
        ember: '0 0 18px rgba(255, 150, 64, 0.22)'
      }
    }
  },
  plugins: []
};
