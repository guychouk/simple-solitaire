import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.js',
  output: {
    file: 'public/game.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    babel(),
    production && terser()
  ]
};
