export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "var(--color-bg-base)",
          surface:  "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
          overlay:  "var(--color-bg-overlay)",
        },
        border: {
          subtle:  "var(--color-border-subtle)",
          default: "var(--color-border-default)",
          strong:  "var(--color-border-strong)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted:     "var(--color-text-muted)",
          disabled:  "var(--color-text-disabled)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
          subtle:  "var(--color-accent-subtle)",
          border:  "var(--color-accent-border)",
        },
        bull:    "var(--color-bull)",
        bear:    "var(--color-bear)",
        success: "var(--color-success)",
        danger:  "var(--color-danger)",
        warning: "var(--color-warning)",
        info:    "var(--color-info)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body:    "var(--font-body)",
        mono:    "var(--font-mono)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};