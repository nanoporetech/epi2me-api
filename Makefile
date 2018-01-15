deps:
	yarn install

mocha: deps
	@NODE_ENV=test node node_modules/.bin/mocha --recursive test/metrichor.Spec test/downloadStream.Spec.js test/fetchToken.Spec.js test/uploadStream.Spec.js

integration_test:
	@NODE_ENV=test node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/e2e

test: mocha
	@NODE_ENV=test node node_modules/.bin/eslint lib

just_cover: deps
	@NODE_ENV=test node node_modules/.bin/istanbul cover node_modules/.bin/mocha -- --recursive --reporter xunit-file test

cover: just_cover
