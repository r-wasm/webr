WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

HTML_TEMPLATES = console.html repl.html
ENTRY_POINTS = console/console.ts repl/repl.ts webR/webR.js
HTML_INDEX = repl.html

JS_SOURCES = $(shell ls **/*.js)
TS_SOURCES = $(shell ls **/*.ts)

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"

HTML_DIST = $(addprefix $(DIST)/,$(HTML_TEMPLATES))
$(DIST): $(JS_SOURCES) $(TS_SOURCES) $(HTML_DIST) \
  Makefile webR/config.js node_modules esbuild.js
	cp $(DIST)/$(HTML_INDEX) $(DIST)/index.html
	npm run build
	touch $@

$(DIST)/%.html: templates/%.html
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" $< > $@

webR/config.js: webR/config.js.in
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" webR/config.js.in > webR/config.js

.PHONY: check
check:
	npx tsc

node_modules: package.json
	npm ci
	touch $@

clean:
	rm -f webR/config.js