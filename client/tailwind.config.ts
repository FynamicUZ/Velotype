import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-arcane-violet',
    'bg-arcane-cyan',
    'bg-arcane-orange',
    'bg-arcane-rose',
    'bg-arcane-lime',
    'bg-arcane-gold',
  ],
  theme: {
    extend: {
      colors: {
        arcane: {
          bg: '#0d0a1f',
          panel: '#1a1535',
          border: '#2d2655',
          violet: '#a855f7',
          cyan: '#22d3ee',
          lime: '#a3e635',
          orange: '#fb923c',
          rose: '#fb7185',
          gold: '#fbbf24',
        },
      },
      fontFamily: {
        display: ['"Press Start 2P"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'float-up': 'float-up 1s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
        'cast': 'cast 0.5s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.8)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-60px)', opacity: '0' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        'cast': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
