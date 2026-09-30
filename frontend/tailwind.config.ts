export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#e6f7ef',
          200: '#c1ebd5',
          300: '#8ed9b1',
          400: '#4ac389',
          500: '#00c070',
          600: '#059669',
          700: '#047857',
          800: '#006241', // Exact reference primary green
          900: '#004e34', // Exact reference dark card green
        },
        sage: {
          50: '#f4f8f5',
          100: '#e6f0e9',
          200: '#cde1d4',
          300: '#a8cdb6',
          400: '#7eb595',
        },
        canvas: '#f4f5f7',
        charcoal: '#111827',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'pill': '0 4px 14px rgba(0, 98, 65, 0.18)',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
