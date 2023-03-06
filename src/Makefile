WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

ROOT = $(abspath .)
PKG_DIST = $(ROOT)/dist

HTML_TEMPLATES = console.html repl.html
HTML_INDEX = repl.html

TS_SOURCES = $(shell find $(ROOT) \
  -not \( -path '$(ROOT)/node_modules' -prune \) \
  -not \( -path '$(PKG_DIST)' -prune \) \
  -name '*.ts')

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"
PKG_BASE_URL ?= "https://repo.r-wasm.org"

HTML_DIST = $(addprefix $(DIST)/,$(HTML_TEMPLATES))
$(DIST): $(TS_SOURCES) $(HTML_DIST) \
  Makefile webR/config.ts node_modules esbuild.js
	cp $(DIST)/$(HTML_INDEX) $(DIST)/index.html
	npm run build
	rm -rf "$(PKG_DIST)"
	touch $@

$(DIST)/%.html: templates/%.html
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" \
	  -e "s|@@PKG_BASE_URL@@|$(PKG_BASE_URL)|" $< > $@

webR/config.ts: webR/config.ts.in
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" \
	  -e "s|@@PKG_BASE_URL@@|$(PKG_BASE_URL)|" webR/config.ts.in > webR/config.ts

.PHONY: lint
lint: $(DIST)
	npx eslint $(TS_SOURCES)

.PHONY: check
check: $(DIST)
	NODE_V8_COVERAGE=coverage npx c8 node ./node_modules/jest/bin/jest.js \
	  --config tests/webr.config.js

.PHONY: check-packages
check-packages: $(DIST)
	npx node ./node_modules/jest/bin/jest.js --config tests/packages.config.js

node_modules: package.json
	npm ci
	touch $@

.PHONY: serve
serve:
	cd $(DIST) && $(ROOT)/serve.py

.PHONY: package
package: $(PKG_DIST)
	npm pack
	rm -rf "$(PKG_DIST)"

.PHONY: publish
publish: $(PKG_DIST)
	npm publish --access=public

$(PKG_DIST): Makefile webR/config.ts node_modules esbuild.js
	npm run build
# Copy R binaries into npm package for distribution
	cd "$(DIST)" && cp -r vfs R.bin.* *.so "$(PKG_DIST)"
	touch $@

clean:
	rm -rf "$(PKG_DIST)"
	rm -f webR/config.ts

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
