/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'monospace'],
        // Landing page body font (BurFlow marketing site)
        body: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        // ── Landing page palette (tokens scoped under `.landing`) ──
        background: 'var(--lp-background)',
        foreground: 'var(--lp-foreground)',
        ink: 'var(--lp-ink)',
        surface: 'var(--lp-surface)',
        'surface-2': 'var(--lp-surface-2)',
        hairline: 'var(--lp-hairline)',
        ember: 'var(--lp-ember)',
        'ember-soft': 'var(--lp-ember-soft)',
        primary: {
          DEFAULT: 'var(--lp-primary)',
          foreground: 'var(--lp-primary-foreground)'
        },
        success: {
          DEFAULT: 'var(--lp-success)',
          '300': '#7FB08F',
          '500': '#3F7855'
        },
        accent: {
          DEFAULT: 'var(--lp-accent)',
          foreground: 'var(--lp-accent-foreground)',
          '200': '#E8C7CE',
          '400': '#B96478',
          '500': '#93304A',
          '600': '#7A2038',
          '700': '#5C1729'
        },
        muted: {
          DEFAULT: 'var(--lp-muted)',
          foreground: 'var(--lp-muted-foreground)'
        },
        card: 'var(--lp-surface)',
        'card-foreground': 'var(--lp-foreground)',
        popover: 'var(--lp-surface)',
        'popover-foreground': 'var(--lp-foreground)',
        warning: {
          '300': '#D9AE5C',
          '500': '#A87A1E',
          '600': '#7A5714'
        },
        error: {
          '300': '#E8948E',
          '500': '#C43B34'
        },
        info: {
          '300': '#8BB3DE',
          '500': '#3E6FA8'
        }
      },
      boxShadow: {
        soft: 'var(--lp-shadow-soft)',
        lift: 'var(--lp-shadow-lift)',
        glow: 'var(--lp-shadow-glow)'
      }
    }
  }
};