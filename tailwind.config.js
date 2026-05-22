/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: { DEFAULT: '#3B82F6', dark: '#2563EB', light: '#60A5FA', '50': '#EFF6FF', '100': '#DBEAFE' },
        success: { DEFAULT: '#10B981', light: '#D1FAE5', '50': '#ECFDF5' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', '50': '#FFFBEB' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2', '50': '#FEF2F2' },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
