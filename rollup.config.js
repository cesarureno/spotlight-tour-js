import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const input = 'src/index.ts';

const tsPlugin = () =>
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
  });

export default [
  // ESM + CJS (main build)
  {
    input,
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
    ],
    plugins: [tsPlugin()],
  },

  // UMD (browser <script> tag)
  {
    input,
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'SpotlightTour',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [tsPlugin()],
  },

  // Type declarations: one per module format, so `require` gets CommonJS types
  {
    input,
    output: [
      { file: 'dist/index.d.ts', format: 'esm' },
      { file: 'dist/index.d.cts', format: 'esm' },
    ],
    plugins: [dts()],
  },
];
