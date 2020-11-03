// rxjs requires parserServices to be generated.
// A value is required for the "parserOptions.project" property for @typescript-eslint/parser
// Adding project: './tsconfig.json to root .eslintrc.js fails
// Because not all tests are TS
// Therefore we set it up here to only run on src
module.exports = {
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  extends: ['../.eslintrc.js', 'plugin:rxjs/recommended'],
  plugins: ['rxjs'],
  rules: {
    'rxjs/finnish': 'error',
    'rxjs/no-subject-value': 'warn', // demote to warn, as we use it
  },
};
