WEBR_ROOT = $(abspath ..)
DIST = $(WEBR_ROOT)/dist

# Configure your local environment in this file
-include ~/.webr-config.mk

BASE_URL ?= "./"

.PHONY: all
all:
	sed -e "s|@@BASE_URL@@|$(BASE_URL)|" webR.js > $(DIST)/webR.js
	cp repl.html $(DIST)/index.html
