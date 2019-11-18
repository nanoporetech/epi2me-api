dist:
	npm run build:dist

test:
	npm run test

lint:
	npm run lint

cover:
	npm run cover

deps:
	apt-get install -y --force-yes nodejs jq

.PHONY: dist test lint cover test_integration
