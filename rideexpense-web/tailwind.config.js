/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: '#171A18',
          900: '#171A18',
          800: '#232724',
          700: '#323733',
        },
        ivory: {
          DEFAULT: '#F4F3ED',
          50: '#FAF9F5',
          100: '#F4F3ED',
          200: '#E8E6DC',
        },
        limeaccent: {
          DEFAULT: '#C5F467',
          400: '#C5F467',
          500: '#B4E94D',
          600: '#9CD634',
        },
        mutedgrey: {
          DEFAULT: '#A6AAA3',
          400: '#A6AAA3',
          500: '#7D827A',
          600: '#5C615A',
        },
        sage: {
          DEFAULT: '#DCE8D0',
          100: '#EEF5E7',
          200: '#DCE8D0',
          300: '#C5D8B3',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        panel: '12px',
      },
    },
  },
  plugins: [],
};
