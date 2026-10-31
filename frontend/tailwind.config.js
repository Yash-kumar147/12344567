/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0D9488',
          dark: '#0F766E',
          tint: '#CCFBF1',
        },
        page: '#F5F7FB',
        card: '#FFFFFF',
        ink: '#172033',
        muted: '#64748B',
        line: '#E2E8F0',
        ok: {
          bg: '#D1FAE5',
          text: '#065F46',
        },
        wait: {
          bg: '#FEF3C7',
          text: '#92400E',
        },
        bad: {
          bg: '#FEE2E2',
          text: '#991B1B',
        }
      }
    },
  },
  plugins: [],
}

