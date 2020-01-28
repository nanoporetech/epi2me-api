const tasks = arr => arr.join(' && ');

module.exports = {
  hooks: {
    'pre-commit': tasks(['npm run test']),
    'pre-push': tasks(['npm run clean', 'npm run test', 'npm run build:dist', 'git commit --amend --no-edit']),
  },
};
