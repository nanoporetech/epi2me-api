MAKE     := make

ifeq ($(OS),Windows_NT)
    MAKE     = gmake
endif

deps:
	npm install

mocha:
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/**/*.Spec.js

integration_test:
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha ./test/e2e-metrichor.Spec.js

test: deps
	node node_modules/jslint/bin/jslint lib/metrichor.js
	node node_modules/mocha/bin/mocha ./test/**/*.Spec.js --reporter xunit-file

just_cover: deps
	node node_modules/istanbul/lib/cli cover node_modules/mocha/bin/_mocha -- --recursive --reporter xunit-file test

cover: just_cover
