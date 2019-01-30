const tasks = arr => arr.join(' && ');

module.exports = {
  hooks: {
    'pre-commit': tasks(['yarn test']),
    'pre-push': tasks(['yarn clean', 'yarn test', 'yarn build:dist', 'git add dist --force']),
  },
};
