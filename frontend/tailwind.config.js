/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'monospace']
      },
      colors: {
        accent: {
          200: '#E8C7CE',
          400: '#B96478',
          500: '#93304A',
          600: '#7A2038',
          700: '#5C1729'
        },
        success: {
          300: '#7FB08F',
          500: '#3F7855'
        },
        warning: {
          300: '#D9AE5C',
          500: '#A87A1E',
          600: '#7A5714'
        },
        error: {
          300: '#E8948E',
          500: '#C43B34'
        },
        info: {
          300: '#8BB3DE',
          500: '#3E6FA8'
        }
      }
    }
  }
};
