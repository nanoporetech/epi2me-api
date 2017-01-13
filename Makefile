MAKE     := make

ifeq ($(OS),Windows_NT)
    MAKE     = gmake
endif

deps:
	npm install

mocha:
	node node_modules/mocha/bin/_mocha ./test/metrichor.Spec.js
	node node_modules/mocha/bin/_mocha ./test/downloadStream.Spec.js
	node node_modules/mocha/bin/_mocha ./test/fetchToken.Spec.js
	node node_modules/mocha/bin/_mocha ./test/uploadStream.Spec.js
	node node_modules/mocha/bin/_mocha ./test/e2e-metrichor.Spec.js

integration_test:
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/e2e-metrichor.Spec.js

test: deps
	node node_modules/eslint/bin/eslint.js lib/metrichor.js
	make mocha

just_cover: deps
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha -- --recursive --reporter xunit-file test

cover: just_cover
