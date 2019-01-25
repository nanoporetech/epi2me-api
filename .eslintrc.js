// ESLint configuration
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  parser: 'babel-eslint',

  extends: ['eslint:recommended', 'airbnb-base', 'prettier', 'prettier/babel'],

  plugins: ['babel', 'prettier'],

  globals: {
    __DEV__: true,
  },

  env: {
    es6: true,
    node: true,
    browser: true,
    mocha: true,
  },

  rules: {
    // Forbid the use of extraneous packages
    // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-extraneous-dependencies.md
    'import/no-extraneous-dependencies': ['error', { packageDir: '.' }],

    // Recommend not to leave any console.info in your code
    // Use console.error, console.warn and console.info instead
    // https://eslint.org/docs/rules/no-console
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    // ESLint favour variable_name instead of variableName
    // https://eslint.org/docs/rules/camelcase
    camelcase: [
      'warn',
      {
        properties: 'never',
      },
    ],

    // Prefer destructuring from arrays and objects
    // http://eslint.org/docs/rules/prefer-destructuring
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: {
          array: false,
          object: true,
        },
        AssignmentExpression: {
          array: false,
          object: false,
        },
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    // ESLint plugin for prettier formatting
    // https://github.com/prettier/eslint-plugin-prettier
    'prettier/prettier': 'warn',

    // Gently coerce devs to improve their code -> best practice
    'no-underscore-dangle': 'warn',
    'no-param-reassign': 'warn',
    'consistent-return': 'warn',
    'no-shadow': 'warn',
    'import/no-dynamic-require': 'warn',
    'global-require': 'warn',
    'no-unused-expressions': 'warn',
    'no-plusplus': 'warn',
    'prefer-promise-reject-errors': 'warn',
    'no-useless-constructor': 'warn',
    'no-restricted-globals': 'warn',
    'no-prototype-builtins': 'warn',
    radix: 'warn',
    'no-lonely-if': 'warn',
    'no-return-await': 'warn',
  },

  settings: {
    // Allow absolute paths in imports, e.g. import Button from 'components/Button'
    // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
};
