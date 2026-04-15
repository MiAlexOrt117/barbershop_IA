import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08111f",
        panel: "#0f1a2d",
        panel2: "#132238",
        accent: {
          DEFAULT: "#72f0c4",
          strong: "#21d69a"
        },
        accentWarm: "#ffb86b",
        danger: "#ff6b7a",
        muted: "#8fa3bf"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(9, 17, 31, 0.45)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top left, rgba(114, 240, 196, 0.16), transparent 30%), radial-gradient(circle at top right, rgba(255, 184, 107, 0.16), transparent 26%), linear-gradient(180deg, rgba(9, 17, 31, 0.98), rgba(5, 11, 21, 1))"
      }
    }
  },
  plugins: []
};

export default config;