WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)
DIST = $(WEBR_ROOT)/dist
TEST_DIR = $(WEBR_ROOT)/tests

INPUTS = $(wildcard *.js)
OUTPUTS = $(patsubst %.js,%.out,$(INPUTS))

.PHONY: test-all
test-all: clean $(OUTPUTS)
	@cd R && make

# Run R test script in webR with node
# Ignore some output we're not interested in, then compare the output
%.out: %.js
	@printf "Testing $<..." && \
	cd $(DIST) && \
	node --experimental-wasm-bigint "$(TEST_DIR)/$<" \
		--quiet  2>&1 | grep -v 'BlobBuilder' | \
		grep -v 'blob constructor' > "$(TEST_DIR)/$@"; \
	cd $(TEST_DIR) && \
	if diff $@ $@.save; then \
		echo "OK"; \
	else \
		echo "FAILED: '$<' output does not match reference" && \
		exit 1; \
	fi

.PHONY: clean
clean:
	@rm -f *.out
	@cd R && make clean
