/** @type {import("tailwindcss").Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter','system-ui','sans-serif'],
        mono: ['JetBrains Mono','monospace'],
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        soft: '0 4px 24px rgba(0,0,0,0.04)',
        medium: '0 8px 32px rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: []
}
