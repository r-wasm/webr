WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)
DIST = $(WEBR_ROOT)/dist
TEST_DIR = $(WEBR_ROOT)/tests

INPUTS = $(wildcard *.R)
OUTPUTS = $(patsubst %.R,%.Rout,$(INPUTS))

.PHONY: test-all
test-all: clean $(OUTPUTS)
	@cd packages && $(MAKE) test-pkgs

%.Rout: %.R
	@printf "Testing $<..." && \
	cd $(DIST) && \
	node --experimental-wasm-bigint $(TEST_DIR)/testRCode.js \
		"$(TEST_DIR)/$<" --quiet  2>&1 | grep -v 'BlobBuilder' | \
		grep -v 'blob constructor' > "$(TEST_DIR)/$@"; \
	cd $(TEST_DIR) && \
	if diff $@ $@.save; then \
		echo "OK"; \
	else \
		echo "FAILED: '$<' output does not match reference" && \
		rm -f $@ && \
		exit; \
	fi

.PHONY: clean
clean:
	@rm -f *.Rout
