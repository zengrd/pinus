MOCHA_OPTS=
TESTS = test/*
REPORTER = dot
TIMEOUT = 5000

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(TESTS) \
		$(MOCHA_OPTS)

test-cov: lib-cov
	@PINUS_RPC_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov:
	@jscoverage lib lib-cov

clean:
	rm -f coverage.html
	rm -fr lib-cov

.PHONY: test clean