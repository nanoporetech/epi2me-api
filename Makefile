dist:
	yarn dist

test:
	yarn test

test_integration:
	yarn test_integration

lint:
	yarn lint

cover:
	yarn cover

deps:
	apt-get install -y --force-yes nodejs
	npm install -g yarn

.PHONY: test lint cover test_integration
