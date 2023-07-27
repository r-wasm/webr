WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

ROOT = $(abspath .)
PKG_DIST = $(ROOT)/dist

HTML_TEMPLATES = repl.html
HTML_INDEX = repl.html

TS_SOURCES = $(shell find $(ROOT) \
  -not \( -path '$(ROOT)/node_modules' -prune \) \
  -not \( -path '$(PKG_DIST)' -prune \) \
  -name '*.ts' -o -name '*.tsx')

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"
PKG_BASE_URL ?= "https://repo.r-wasm.org"

HTML_DIST = $(addprefix $(DIST)/,$(HTML_TEMPLATES))
$(DIST): $(TS_SOURCES) $(HTML_DIST) \
  Makefile webR/config.ts node_modules esbuild.ts
	cp $(DIST)/$(HTML_INDEX) $(DIST)/index.html
	npm run build
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
serve: esbuild.ts $(DIST)
	npm run serve

.PHONY: package
package: $(PKG_DIST)/webr.mjs $(PKG_DIST)/vfs
	npm pack
	rm -rf "$(PKG_DIST)"

DIST_TAG ?= "latest"
.PHONY: publish
publish: $(PKG_DIST)/webr.mjs $(PKG_DIST)/vfs
	npm publish --access=public --tag $(DIST_TAG)
	rm -rf "$(PKG_DIST)"

# Prepare the PKG_DIST directory for npm packaging and/or publication.
# Builds the webR npm package for distribution, then copies the required R
# binaries and lazy vfs into the npm package.
$(PKG_DIST)/webr.mjs $(PKG_DIST)/vfs: webR/config.ts node_modules esbuild.ts
	npm run build -- --prod
	cd "$(DIST)" && cp -r vfs R.bin.* *.so "$(PKG_DIST)"

clean:
	rm -rf "$(PKG_DIST)"
	rm -f webR/config.ts

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
