import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import json from '@rollup/plugin-json';
import license from 'rollup-plugin-license';
// import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import pkg from './package.json';
import { join } from 'path';
import { invariant } from 'ts-runtime-typecheck';

const commonPlugins = [
  json(),
  typescript({ tsconfig: './tsconfig.main.json' }),
  commonjs(),
  // terser(),
  license({
    banner: 'Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) <%= moment().format(\'YYYY\') %>',
  }),
];

const commonPackage = {
  name: pkg.name,
  version: generateVersion(pkg.version),
  license: pkg.license,
  repository: pkg.repository,
  description: pkg.description,
  author: pkg.author,
};

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  'fs',
  'fs-extra',
  'util',
  'path',
  'url',
  'punycode',
  'querystring',
  'os',
  'crypto',
  'zlib',
  'readline',

  'rxjs/operators',
  '@apollo/client/core',
  '@apollo/client/link/error',
  'google-protobuf/google/protobuf/empty_pb',
  'google-protobuf/google/protobuf/struct_pb',
  'google-protobuf/google/protobuf/empty_pb.js',
  'google-protobuf/google/protobuf/struct_pb.js'
];

const normal = {
  input: 'src/index.ts',
	preserveModules: true,
  external,
  plugins: [
    ...commonPlugins,
    copy({
      targets: [
        { src: './protos', dest: 'dist/core' },
        { src: './LICENCE', dest: 'dist/core' },
        { src: './README.md', dest: 'dist/core' },
      ],
      verbose: false,
    }),
    generatePackageJson({
      outputFolder: 'dist/core',
      baseContents: {
        ...commonPackage,
        main: 'cjs/src/index.js',
        module: 'mjs/src/index.mjs',
        types: 'mjs/src/index.d.ts',
      },
      additionalDependencies: pkg.dependencies,
    }),
  ],
  output: generateOutput('dist/core')
};

const web = {
  input: 'src/index-web.ts',
	preserveModules: true,
  external,
  plugins: [
    ...commonPlugins,
    copy({
      targets: [
        { src: './protos', dest: 'dist/web' },
        { src: './LICENCE', dest: 'dist/web' },
        { src: './README.md', dest: 'dist/web' },
      ],
      verbose: false,
    }),
    generatePackageJson({
      outputFolder: 'dist/web',
      baseContents: {
        ...commonPackage,
        main: 'cjs/src/index-web.js',
        module: 'mjs/src/index-web.mjs',
        types: 'mjs/src/index-web.d.ts',

        name: pkg.name.replace('-api', '-web'),
        description: `Web-only ${pkg.description}`,
      },
      additionalDependencies: pkg.dependencies,
    }),
  ],
  output: generateOutput('dist/web')
};

function generateVersion (version) {
  const match = /^(\d+.\d+)/.exec(version);
  invariant(match, 'Invalid package version');

  return `${match[1]}.${process.env.PATCH ?? 0}`;
}

function generateOutput (folder) {
  return [
    {
			dir: join(folder, 'cjs'),
			entryFileNames: '[name].js',
      exports: 'named',
      sourcemap: true,
			format: 'cjs'
		},
		{
			dir: join(folder, 'mjs'),
			entryFileNames: '[name].mjs',
      exports: 'named',
      sourcemap: true,
			format: 'esm'
		}
  ]
}

export default [web, normal];
