/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf7',
          100: '#d6f3eb',
          200: '#afe6d8',
          300: '#7ad2bf',
          400: '#42b7a1',
          500: '#269b87',
          600: '#1a7d6e',
          700: '#17645a',
          800: '#16504a',
          900: '#0f3d3a',
          950: '#072522',
        },
        ink: {
          50: '#f6f7f7',
          100: '#eceeed',
          200: '#d7dcda',
          300: '#b2bbb8',
          400: '#869490',
          500: '#677772',
          600: '#505f5b',
          700: '#424e4b',
          800: '#38413f',
          900: '#212a28',
          950: '#111817',
        },
        cream: '#f7f6f1',
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 28px -16px rgba(16, 24, 40, 0.18)',
        card: '0 1px 3px rgba(16, 24, 40, 0.05), 0 20px 45px -30px rgba(16, 24, 40, 0.25)',
        float: '0 24px 60px -24px rgba(9, 45, 42, 0.35)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(23,100,90,.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,100,90,.055) 1px, transparent 1px)',
        'hero-glow':
          'radial-gradient(900px 420px at 78% 10%, rgba(66,183,161,.18), transparent 60%), radial-gradient(600px 360px at 8% 90%, rgba(245,158,11,.10), transparent 65%)',
      },
      backgroundSize: {
        grid: '34px 34px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        'fade-in': 'fade-in .3s ease-out both',
        'scale-in': 'scale-in .2s ease-out both',
      },
    },
  },
  plugins: [],
}
