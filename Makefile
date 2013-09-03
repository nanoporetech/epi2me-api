deps:
	npm install mocha proxyquire request xunit-file

test: deps
	@./node_modules/.bin/mocha --reporter xunit-file
