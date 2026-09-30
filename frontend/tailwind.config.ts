export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        paper: '#f7f6f2',
        ink: '#17211c',
        muted: '#5e6a63',
        line: '#dedfd8',
        forest: {
          50: '#f2f7f4',
          100: '#e4efe9',
          200: '#c9dfd3',
          300: '#a4c9b5',
          400: '#77ad93',
          500: '#498e70',
          600: '#287658',
          700: '#17644d',
          800: '#104b39',
          900: '#0c392c',
        },
        rust: { DEFAULT: '#a64d35', light: '#f8eee9' },
        amber: { DEFAULT: '#93611f', light: '#f5efe2' },
        canvas: '#f7f6f2',
        charcoal: '#17211c',
        sage: { 50: '#f2f7f4', 100: '#e4efe9', 200: '#c9dfd3', 300: '#a4c9b5', 400: '#77ad93' },
      },
      borderRadius: {
        '2xl': '0.875rem',
        '3xl': '1.125rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        card: '0 8px 28px rgba(23, 33, 28, 0.05)',
        soft: '0 12px 36px rgba(23, 33, 28, 0.06)',
      },
    },
  },
  plugins: [],
};
