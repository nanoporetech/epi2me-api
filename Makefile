deps:
	yarn install

mocha: deps
	@NODE_ENV=test node node_modules/.bin/mocha ./test/*Spec*

integration_test:
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/e2e

test: mocha
	node node_modules/.bin/eslint lib

just_cover: deps
	node node_modules/.bin/istanbul cover node_modules/.bin/mocha -- --recursive --reporter xunit-file test

cover: just_cover
