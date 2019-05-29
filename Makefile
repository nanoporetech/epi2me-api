dist:
	yarn build:dist

test:
	yarn test

lint:
	yarn lint

cover:
	yarn cover

deps:
	apt-get install -y --force-yes nodejs jq
	npm install -g yarn

.PHONY: dist test lint cover test_integration
