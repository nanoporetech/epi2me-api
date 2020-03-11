module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    commonjs: true,
    node: true,
    mocha: true,
    es6: true,
  },
  rules: {
    camelcase: 'off',
    '@typescript-eslint/camelcase': ['error', { properties: 'never' }],
    '@typescript-eslint/class-name-casing': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
};
