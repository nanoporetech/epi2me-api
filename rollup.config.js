import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import json from '@rollup/plugin-json';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import pkg from './package.json';

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'fs',
  'fs-extra',
  'util',
  'path',
  'os',
  'crypto',
  'zlib',
  'readline',
];

const pluginsCommon = [
  // Allow json resolution
  json(),
  // Compile TypeScript files
  typescript(),
  // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
  commonjs({ extensions: ['.js', '.ts'] }),
  // Allow node_modules resolution, so you can use 'external' to control
  // which external modules to include in the bundle
  // https://github.com/rollup/rollup-plugin-node-resolve#usage
  resolve(),

  // Resolve source maps to the original source
  sourceMaps(),
  license({
    banner: `Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) <%= moment().format('YYYY') %>`,
  }),
];

const packageCommon = {
  name: pkg.name,
  license: pkg.license,
  author: pkg.author,
  repository: pkg.repository,
  description: `${pkg.description}`,
  private: false,
  version: pkg.version,
};

const epi2meFull = {
  input: `src/index.ts`,
  output: [
    { file: pkg.components.core.module, format: 'esm', exports: 'named', sourcemap: true },
    {
      file: pkg.components.core.module.replace('esm.js', 'esm.min.js'),
      format: 'esm',
      exports: 'named',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  external,
  watch: {
    include: ['src/**'],
  },
  plugins: [
    ...pluginsCommon,
    copy({
      targets: [
        { src: './build/types/src/*', dest: 'dist/core/types' },
        { src: './build/esm/src/*', dest: 'dist/core/esm' },
        { src: './build/cjs/src/*', dest: 'dist/core/cjs' },
        { src: './protos', dest: 'dist/core' },
        { src: './LICENCE', dest: 'dist/core' },
        { src: './README.md', dest: 'dist/core' },
      ],
      verbose: false,
    }),
    generatePackageJson({
      outputFolder: 'dist/core',
      baseContents: {
        ...packageCommon,
        main: 'cjs/index.js',
        module: 'esm/index.js',
        types: 'types/index.d.ts',
        typings: 'types/index.d.ts',
      },
      additionalDependencies: {
        graphql: pkg.dependencies.graphql,
        '@apollo/client': pkg.dependencies['@apollo/client'],
      },
    }),
  ],
};

const epi2meWeb = {
  input: `src/index-web.ts`,
  output: [
    { file: pkg.components.web.module, format: 'esm', exports: 'named', sourcemap: true },
    {
      file: pkg.components.web.module.replace('esm.js', 'esm.min.js'),
      format: 'esm',
      exports: 'named',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external,
  watch: {
    include: ['src/**'],
  },
  plugins: [
    ...pluginsCommon,
    copy({
      targets: [
        { src: './build/web/types/src/*', dest: 'dist/web/types' },
        { src: './build/esm/src/*', dest: 'dist/web/esm' },
        { src: './build/cjs/src/*', dest: 'dist/web/cjs' },
        { src: './protos', dest: 'dist/web' },
        { src: './LICENCE', dest: 'dist/web' },
        { src: './README.md', dest: 'dist/web' },
      ],
      verbose: false,
    }),
    generatePackageJson({
      outputFolder: 'dist/web',
      baseContents: {
        ...packageCommon,
        main: 'cjs/index-web.js',
        module: 'esm/index-web.js',
        name: pkg.name.replace('-api', '-web'),
        description: `Web-only ${pkg.description}`,
        types: 'types/index-web.d.ts',
        typings: 'types/index-web.d.ts',
      },
      additionalDependencies: {
        graphql: pkg.dependencies.graphql,
        '@apollo/client': pkg.dependencies['@apollo/client'],
      },
    }),
  ],
};

export default [epi2meFull, epi2meWeb];
