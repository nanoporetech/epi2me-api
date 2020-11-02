// Adding project: 'tsconfig.json to root eslintrc fails
// because not all tests are TS
// only applies to rxjs
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
