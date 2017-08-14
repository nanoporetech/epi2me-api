MAKE     := make

ifeq ($(OS),Windows_NT)
    MAKE     = gmake
endif

deps:
	npm install

mocha: deps
	@NODE_ENV=test find test -type f -name \*.js -exec node node_modules/.bin/mocha {} \;

integration_test:
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/e2e-metrichor.Spec.js

test: mocha
	node node_modules/eslint/bin/eslint.js lib/metrichor.js

just_cover: deps
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha -- --recursive --reporter xunit-file test

cover: just_cover
