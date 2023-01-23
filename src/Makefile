WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

ROOT = $(abspath .)

HTML_TEMPLATES = console.html repl.html
ENTRY_POINTS = console/console.ts repl/repl.ts webR/webr-worker.ts
HTML_INDEX = repl.html

TS_SOURCES = $(shell find . -name '*.ts' -not -path './node_modules/*')

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"
PKG_BASE_URL ?= "https://repo.webr.workers.dev/"

HTML_DIST = $(addprefix $(DIST)/,$(HTML_TEMPLATES))
$(DIST): $(TS_SOURCES) $(HTML_DIST) \
  Makefile webR/config.ts node_modules esbuild.js
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
	npx tsc
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

clean:
	rm -f webR/config.ts
