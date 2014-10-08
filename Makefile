deps:
	npm install

test_common:
	node_modules/.bin/jslint metrichor.js

test: deps
	make test_common
	@./node_modules/.bin/mocha --reporter xunit-file

just_test: test_common
	@./node_modules/.bin/mocha
