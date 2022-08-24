WEBR_ROOT = $(abspath ../..)
DIST = $(WEBR_ROOT)/dist
TEST_DIR = $(WEBR_ROOT)/tests/R

INPUTS = $(wildcard *.R)
OUTPUTS = $(patsubst %.R,%.Rout,$(INPUTS))

.PHONY: test
test: clean $(OUTPUTS)

# Run R test script in webR with node
# Ignore some output we're not interested in, then compare the output
%.Rout: %.R
	@printf "Testing $<..." && \
	cd $(DIST) && \
	node --experimental-wasm-bigint $(TEST_DIR)/testRCode.js \
		"$(TEST_DIR)/$<" --quiet  2>&1 \
		| grep -v 'BlobBuilder' \
		| grep -v 'blob constructor' \
		| grep -v '\/tmp\/' \
		| grep -v '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' \
		| grep -v '0x[0-9a-f][0-9a-f]*' \
		> "$(TEST_DIR)/$@"; \
	cd $(TEST_DIR) && \
	if diff $@ $@.save; then \
		echo "OK"; \
	else \
		echo "FAILED: '$<' output does not match reference" && \
		exit 1; \
	fi

.PHONY: clean
clean:
	@rm -f *.Rout
