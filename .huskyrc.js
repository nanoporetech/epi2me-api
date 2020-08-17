const tasks = arr => arr.join(' && ');

module.exports = {
  hooks: {
    'pre-commit': tasks(['npm run test']),
    'pre-push': tasks(['echo " \u001b[31mDID YOU REMEMBER TO BUILD??\u001b[0m"']),
  },
};
