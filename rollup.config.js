import sucrase from '@rollup/plugin-sucrase';
import path from 'path';
import analyze from 'rollup-plugin-analyzer';
import copy from 'rollup-plugin-cpy';
import { eslint } from 'rollup-plugin-eslint';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import json from 'rollup-plugin-json';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})];
const plugins = [
  json(),
  analyze(),
  eslint({
    throwOnError: true, //  Will eventually be set to true
    throwOnWarning: false, //  Will eventually be set to true
    exclude: ['node_modules/**', './**/*.json'],
  }),
  sucrase({
    exclude: ['node_modules/**', 'test/**'],
    transforms: ['typescript'],
  }),
  terser({
    parse: {
      // we want terser to parse ecma 8 code. However, we don't want it
      // to apply any minification steps that turns valid ecma 5 code
      // into invalid ecma 5 code. This is why the 'compress' and 'output'
      // sections only apply transformations that are ecma 5 safe
      // https://github.com/facebook/create-react-app/pull/4234
      ecma: 8,
    },
    compress: {
      ecma: 5,
      warnings: false,
      // Disabled because of an issue with Uglify breaking seemingly valid code:
      // Pending further investigation:
      // https://github.com/mishoo/UglifyJS2/issues/2011
      comparisons: false,
      // Disabled because of an issue with Terser breaking valid code:
      // Pending futher investigation:
      // https://github.com/terser-js/terser/issues/120
      inline: 2,
    },
    mangle: {
      safari10: true,
    },
    output: {
      ecma: 5,
      comments: false,
      // Turned on because emoji and regex is not minified properly using default
      // https://github.com/facebook/create-react-app/issues/2488
      ascii_only: true,
    },
  }),
  license({
    banner: `Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) <%= moment().format('YYYY') %>`,
  }),
];

const epi2meFull = {
  input: 'src/epi2me-fs.js',
  output: [
    {
      file: path.join(path.dirname(pkg.main), 'index.js'),
      format: 'cjs',
    },
    {
      file: path.join(path.dirname(pkg.module), 'index.es.js'),
      format: 'es',
    },
  ],
  external,
  plugins: [
    ...plugins,
    copy([
      {
        files: ['./README.md', './LICENCE'],
        dest: 'dist',
        options: {
          verbose: true,
        },
      },
      {
        files: ['./src/migrations/*'],
        dest: 'dist/migrations',
        options: {
          verbose: true,
        },
      },
    ]),
    generatePackageJson({
      outputFolder: 'dist',
      baseContents: {
        name: pkg.name,
        private: true,
        version: pkg.verbose,
      },
    }),
  ],
};

const epi2meProfile = {
  input: 'src/profile-fs.ts',
  output: [
    {
      file: path.join(path.dirname(pkg.main), 'profile/index.js'),
      format: 'cjs',
    },
  ],
  external,
  plugins: [
    ...plugins,
    copy({
      files: ['./README.md', './LICENCE'],
      dest: 'dist/profile',
      options: {
        verbose: true,
      },
    }),
    generatePackageJson({
      outputFolder: 'dist/profile',
      baseContents: {
        name: 'profile',
        private: true,
        version: pkg.verbose,
      },
    }),
  ],
};

const epi2meWeb = {
  input: 'src/epi2me.js',
  output: [
    {
      file: path.join(path.dirname(pkg.main), 'web/index.js'),
      format: 'cjs',
    },
    {
      file: path.join(path.dirname(pkg.module), 'web/index.es.js'),
      format: 'es',
    },
  ],
  external,
  plugins: [
    ...plugins,
    generatePackageJson({
      outputFolder: 'dist/web',
      baseContents: {
        name: pkg.name,
        private: true,
        version: pkg.verbose,
      },
    }),
  ],
};

export default [epi2meFull, epi2meProfile, epi2meWeb];
