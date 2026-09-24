import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // El empleado completa un control con una mano, en una cocina.
      // Botones grandes, maximo contraste. Ver /mnt/skills/public/frontend-design
      // cuando se arranque el Sprint 1 para lineamientos de diseño.
      minHeight: { touch: '56px' },
    },
  },
  plugins: [],
};

export default config;
