deps:
	npm install mocha proxyquire request

test: deps
	@./node_modules/.bin/mocha
