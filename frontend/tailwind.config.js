/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        surface: "#0f172a",
        border: "#1e293b",
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          light: "#818cf8",
          dark: "#4338ca",
        },
        accent: {
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          violet: "#8b5cf6",
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.4)",
        "glow-emerald": "0 0 25px -5px rgba(16, 185, 129, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.4)",
      }
    },
  },
  plugins: [],
}
