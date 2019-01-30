dist:
	yarn dist

test:
	yarn test

lint:
	yarn lint

cover:
	yarn cover

deps:
	apt-get install -y --force-yes nodejs
	npm install -g yarn

.PHONY: dist test lint cover test_integration
