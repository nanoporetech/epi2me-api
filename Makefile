deps:
	npm install

test_common:
	node_modules/.bin/jslint metrichor.js

test: deps
	make test_common
	@./node_modules/.bin/mocha --reporter xunit-file

just_test: test_common
	@./node_modules/.bin/mocha

cover: deps
	make just_cover

just_cover:
	node_modules/.bin/istanbul cover node_modules//mocha/bin/_mocha -- --reporter xunit-file test/*js
