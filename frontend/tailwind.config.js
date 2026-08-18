/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0c111d", // rich deep slate navy instead of pitch black
        surface: {
          DEFAULT: "#151d2f",
          muted: "#1a2338",
          subtle: "#222d46",
          well: "#0f1523",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.09)",
          subtle: "rgba(255, 255, 255, 0.06)",
          strong: "rgba(255, 255, 255, 0.15)",
          focus: "rgba(99, 102, 241, 0.5)",
        },
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
        display: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.35)",
        "glass-lg": "0 20px 45px -15px rgba(0, 0, 0, 0.5)",
        glow: "0 0 35px -5px rgba(99, 102, 241, 0.25)",
        "glow-emerald": "0 0 30px -5px rgba(16, 185, 129, 0.25)",
        "glow-cyan": "0 0 30px -5px rgba(6, 182, 212, 0.25)",
        "glow-amber": "0 0 30px -5px rgba(245, 158, 11, 0.25)",
        "glow-purple": "0 0 30px -5px rgba(168, 85, 247, 0.25)",
      },
      animation: {
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        }
      }
    },
  },
  plugins: [],
}
