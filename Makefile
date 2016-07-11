MAKE     := make

ifeq ($(OS),Windows_NT)
    MAKE     = gmake
endif

deps:
	npm install

test: deps
	XUNIT_FILE=xunit.xml node_modules/mocha/bin/mocha test/unit/**/* --compilers coffee:coffee-script/register -t 30000 --reporter xunit-file