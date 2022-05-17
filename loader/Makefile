WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

HTML_INDEX = repl.html
ENTRY_POINT = src/repl.js

JS_SOURCES = $(shell ls src/*.js)
TS_SOURCES = $(shell ls src/*.ts)

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"


$(DIST): $(JS_SOURCES) $(TS_SOURCES) $(HTML_INDEX) Makefile
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" src/config.js.in > src/config.js
	cp $(HTML_INDEX) $(DIST)/index.html
	esbuild $(ENTRY_POINT) \
	  --outdir=$(DIST) \
	  --bundle \
	  --target="es2015" \
	  --sourcemap
	touch $@
