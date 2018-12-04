// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

const plugins = [resolve(), commonjs(), babel()];
export default [
  {
    output: {
      file: 'build/Chart.Sunburst.umd.js',
      name: 'ChartjsSunburst',
      format: 'umd',
      globals: {
        'chart.js': 'Chart'
      }
    },
    external: ['chart.js'],
    plugins
  },
  {
    output: {
      file: 'build/Chart.Sunburst.cjs.js',
      name: 'ChartjsSunburst',
      format: 'cjs'
    },
    external: ['chart.js'],
    plugins
  }
];
