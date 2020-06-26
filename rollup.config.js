import babel from 'rollup-plugin-babel';

export default {
  input: 'src/main.js',
  output: {
    file: 'public/game.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    babel(),
  ]
};
