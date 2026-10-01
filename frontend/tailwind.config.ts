export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        editorial: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        paper: '#F7F6F2',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#17211C',
          muted: '#526058',
          subtle: '#7E8C84',
        },
        forest: {
          DEFAULT: '#1B4332',
          hover: '#143225',
          light: '#EAF2EC',
          50: '#f0fdf4',
          100: '#eaf2ec',
          200: '#c1ebd5',
          300: '#8ed9b1',
          400: '#4ac389',
          500: '#2d6a4f',
          600: '#1b4332',
          700: '#143225',
          800: '#0f241a',
          900: '#08140e',
        },
        rust: {
          DEFAULT: '#A34338',
          hover: '#87362C',
          light: '#FDF2F0',
          50: '#fff5f5',
          100: '#fed7d7',
          500: '#a34338',
          600: '#87362c',
        },
        rule: '#E5E3DA',
        canvas: '#F7F6F2',
        charcoal: '#17211C',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'sheet': '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
