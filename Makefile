WEBR_ROOT = $(abspath .)
WASM = $(WEBR_ROOT)/wasm
HOST = $(WEBR_ROOT)/host
TOOLS = $(WEBR_ROOT)/tools

default: webr

# This is created at configure-time
include $(TOOLS)/fortran.mk

# Build webR and install the web app in `./dist`
.PHONY: webr
webr: $(EMFC) $(FORTRAN_WASM_LIB) libs
	cd R && $(MAKE) && $(MAKE) install
	cd src && $(MAKE)

# Supporting libs for webr
.PHONY: libs
libs:
	cd libs && $(MAKE)

# Build webR in a temporary docker container
.PHONY: docker-webr
docker-webr:
	mkdir -p dist
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD),target=/app webr-build

# Create a permanent docker container for building webR. Call `make`
# from within the container to start the build.
.PHONY: docker-container-%
docker-container-%:
	docker build -t webr-build .
	docker run -dit --name $* --mount type=bind,source=$(PWD),target=/app webr-build bash

docs: docs/build
docs/build:
	cd docs && $(MAKE) api && $(MAKE) html

.PHONY: check
check:
	cd src && $(MAKE) check

.PHONY: check-pr
check-pr:
	cd src && $(MAKE) lint && $(MAKE) check && $(MAKE) check-packages

.PHONY: clean
clean:
	rm -rf $(HOST) $(WASM)/R-*
	cd R && $(MAKE) clean

.PHONY: clean-wasm
clean-wasm: clean
	rm -rf $(WASM)
	cd libs && $(MAKE) clean

.PHONY: distclean
distclean: clean-wasm clean-tools
	rm -rf dist
