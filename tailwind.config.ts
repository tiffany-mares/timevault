import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        serif: ["Merriweather", "Georgia", "Times New Roman", "serif"],
        body: ["Schibsted Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["Spline Sans Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Domain palette
        navy: "hsl(var(--navy))",
        olive: "hsl(var(--olive))",
        "olive-light": "hsl(var(--olive-light))",
        parchment: "hsl(var(--parchment))",
        "parchment-dark": "hsl(var(--parchment-dark))",
        rust: "hsl(var(--rust))",
        gold: "hsl(var(--gold))",
        "gold-light": "hsl(var(--gold-light))",
        teal: "hsl(var(--teal))",
        burgundy: "hsl(var(--burgundy))",
        copper: "hsl(var(--copper))",
        sage: "hsl(var(--sage))",
        "slate-blue": "hsl(var(--slate-blue))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
