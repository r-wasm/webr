WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)
DIST = $(WEBR_ROOT)/dist
TEST_DIR = $(WEBR_ROOT)/tests/packages

# PKGS =  base datasets compiler grDevices grid splines stats4
# PKGS += utils graphics methods profile stats tcltk tools
PKGS = datasets

.PHONY: test-pkgs
test-pkgs:
	@for pkg in $(PKGS); do \
		printf "Testing $${pkg}..." && \
		cd $(DIST) && \
		node --experimental-wasm-bigint $(TEST_DIR)/testInstalledPackage.js \
			$${pkg} --quiet 2>&1 | grep -v 'BlobBuilder' | \
			grep -v 'blob constructor' > $(TEST_DIR)/$${pkg}.Rout; \
		cd $(TEST_DIR) && \
		if diff $${pkg}.Rout $${pkg}.Rout.save; then \
			echo "OK"; \
		else \
			echo "FAILED: package '$${pkg}' output does not match reference" \
				&& exit 1; \
		fi; \
	done

.PHONY: clean
clean:
	rm -f *.Rout
