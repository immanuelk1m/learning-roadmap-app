/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f3f4ff',
          100: '#e8eaff',
          200: '#d4d8ff',
          300: '#b6bbff',
          400: '#9590ff',
          500: '#7c68ff',
          600: '#6c47ff',
          700: '#5e35ff',
          800: '#4d2bd4',
          900: '#4027a8',
        },
        secondary: {
          50: '#eefff4',
          100: '#d8ffe6',
          200: '#b4ffce',
          300: '#82ffab',
          400: '#4eff81',
          500: '#10d396',
          600: '#05b87a',
          700: '#099664',
          800: '#0d7552',
          900: '#0e6145',
        },
        accent: {
          50: '#fff4ed',
          100: '#ffe6d5',
          200: '#ffcaa9',
          300: '#ffa373',
          400: '#ff6b35',
          500: '#fe4c12',
          600: '#ef3008',
          700: '#c62209',
          800: '#9d1f10',
          900: '#7e1f10',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'modern': '0 10px 40px rgba(0, 0, 0, 0.1)',
        'modern-hover': '0 20px 60px rgba(0, 0, 0, 0.15)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'gradient': 'gradient 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [],
}