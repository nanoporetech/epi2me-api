import json from 'rollup-plugin-json';
import { eslint } from 'rollup-plugin-eslint';
import analyze from 'rollup-plugin-analyzer';
import generatePackageJson from 'rollup-plugin-generate-package-json';
// import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-cpy';
import license from 'rollup-plugin-license';
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
  // terser({
  //   parse: {
  //     // we want terser to parse ecma 8 code. However, we don't want it
  //     // to apply any minfication steps that turns valid ecma 5 code
  //     // into invalid ecma 5 code. This is why the 'compress' and 'output'
  //     // sections only apply transformations that are ecma 5 safe
  //     // https://github.com/facebook/create-react-app/pull/4234
  //     ecma: 8,
  //   },
  //   compress: {
  //     ecma: 5,
  //     warnings: false,
  //     // Disabled because of an issue with Uglify breaking seemingly valid code:
  //     // Pending further investigation:
  //     // https://github.com/mishoo/UglifyJS2/issues/2011
  //     comparisons: false,
  //     // Disabled because of an issue with Terser breaking valid code:
  //     // Pending futher investigation:
  //     // https://github.com/terser-js/terser/issues/120
  //     inline: 2,
  //   },
  //   mangle: {
  //     safari10: true,
  //   },
  //   output: {
  //     ecma: 5,
  //     comments: false,
  //     // Turned on because emoji and regex is not minified properly using default
  //     // https://github.com/facebook/create-react-app/issues/2488
  //     ascii_only: true,
  //   },
  // }),
  license({
    banner: `Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) <%= moment().format('YYYY') %>`,
  }),
];

const epi2meFull = {
  input: 'src/epi2me.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  external,
  plugins: [
    ...plugins,
    copy({
      files: ['./README.md', './LICENCE'],
      dest: 'dist',
      options: {
        verbose: true,
      },
    }),
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

const epi2meWeb = {
  input: 'src/rest.js',
  output: [
    {
      file: 'dist/web/index.js',
      format: 'cjs',
    },
    {
      file: 'dist/web/index.es.js',
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

export default [epi2meFull, epi2meWeb];
