/**
 * Tailwind CSS 主题配置
 * 深空指挥舱主题：深色底、青色主强调、玻璃面板与 HUD 动效
 */
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
        display: [
          '"Space Grotesk"',
          '"Inter"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Cascadia Code"',
          '"Cascadia Mono"',
          '"SFMono-Regular"',
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        space: "#050A12",
        deep: "#08111F",
        panel: "#0B1728",
        line: "#1B2C44",
        fg: "#E8F2FF",
        dim: "#8FA6BF",
        accent: "#22D3EE",
        iris: "#8B5CF6",
        neon: "#34F5A8",
        warn: "#F5B544",
        danger: "#FF5C7A",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 0 30px -8px rgba(34,211,238,0.45)",
        "glow-lg":
          "0 0 0 1px rgba(34,211,238,0.35), 0 0 48px -6px rgba(34,211,238,0.55)",
        panel: "0 30px 90px rgba(0,0,0,0.5)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.08)" },
        },
        pulseRing: {
          "0%": { opacity: "0.55", transform: "scale(0.92)" },
          "100%": { opacity: "0", transform: "scale(1.7)" },
        },
        flow: {
          to: { strokeDashoffset: "-32" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          to: { transform: "rotate(360deg)" },
        },
        orbit: {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        breathe: "breathe 9s ease-in-out infinite",
        "pulse-ring": "pulseRing 1.8s ease-out infinite",
        flow: "flow 1s linear infinite",
        blink: "blink 1.1s step-end infinite",
        rise: "rise 0.35s cubic-bezier(0.4,0,0.2,1) both",
        sweep: "sweep 7s linear infinite",
        orbit: "orbit 45s linear infinite",
      },
      letterSpacing: {
        hud: "0.22em",
      },
      opacity: {
        12: "0.12",
        15: "0.15",
        16: "0.16",
        18: "0.18",
        22: "0.22",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
        88: "0.88",
      },
    },
  },
  plugins: [],
} satisfies Config;
