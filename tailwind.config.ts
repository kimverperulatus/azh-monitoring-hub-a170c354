import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Company brand colors
        brand: {
          red: {
            50:  "#fdf3f4",
            100: "#fce6e8",
            200: "#f9d0d5",
            300: "#f4a8b2",
            400: "#ec7589",
            500: "#e14561",
            600: "#c42a46",
            700: "#a61e37",
            800: "#7a1c2a",
            900: "#5a1520",
            950: "#3d0e16",
          },
          navy: {
            50:  "#f0f1f8",
            100: "#dee0f0",
            200: "#bbbfe1",
            300: "#8a90cc",
            400: "#5f66b4",
            500: "#40469e",
            600: "#2e3485",
            700: "#26296b",
            800: "#1c2040",
            900: "#131629",
            950: "#0a0c1a",
          },
          gold: {
            50:  "#fbf8ec",
            100: "#f6efd0",
            200: "#ecdba0",
            300: "#e0c368",
            400: "#d4ac44",
            500: "#c2a040",
            600: "#a4832e",
            700: "#7e6122",
            800: "#574116",
            900: "#2e220b",
            950: "#170f04",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
