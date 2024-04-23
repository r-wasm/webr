WEBR_ROOT ?= $(abspath .)
WASM = $(WEBR_ROOT)/wasm
HOST = $(WEBR_ROOT)/host
TOOLS = $(WEBR_ROOT)/tools

default: webr

# This is created at configure-time
include $(TOOLS)/fortran.mk

.PHONY: webr
webr: $(EMFC) $(FORTRAN_WASM_LIB) libs ## Build webR and install the web app in `./dist`
	cd R && $(MAKE) && $(MAKE) install
	cd src && $(MAKE)

.PHONY: libs
libs: ## Compile supporting libs for webR
	cd libs && $(MAKE)

.PHONY: docker-webr
docker-webr: ## Build webR in a temporary Docker container
	mkdir -p dist
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD),target=/app webr-build

# Create a permanent docker container for building webR. Call `make`
# from within the container to start the build.
.PHONY: docker-container-%
docker-container-%: ## Build webR development Docker container using a supplied name
	docker build -t webr-build .
	docker run -dit --name $* --mount type=bind,source=$(PWD),target=/app webr-build bash

docs: docs/build ## Build JS documentation and Quarto website
docs/build: ## Build JS documentation and Quarto website
	cd docs && $(MAKE) api && $(MAKE) html

.PHONY: check
check: ## Check Nodejs coverage
	cd src && $(MAKE) check

.PHONY: check-pr
check-pr: ## Check pull request by running linting, Nodejs coverage, and Node js package check.
	cd src && $(MAKE) lint && $(MAKE) check && $(MAKE) check-packages

.PHONY: clean
clean:  ## Remove R WASM and R compilations
	rm -rf $(HOST) $(WASM)/R-*
	cd R && $(MAKE) clean

.PHONY: clean-wasm
clean-wasm: clean ## Remove WASM compilation and libs
	rm -rf $(WASM)
	cd libs && $(MAKE) clean

.PHONY: distclean
distclean: clean-wasm clean-tools ## Remove WASM compilation, libs, tools, and dist
	rm -rf dist

.PHONY: help
help:  ## Show help messages for make targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: debug
debug: ## Print all variables for debugging
	@printf "\033[32m%-18s\033[0m %s\n" "WEBR_ROOT" "$(WEBR_ROOT)"
	@printf "\033[32m%-18s\033[0m %s\n" "WASM" "$(WASM)"
	@printf "\033[32m%-18s\033[0m %s\n" "HOST" "$(HOST)"
	@printf "\033[32m%-18s\033[0m %s\n" "TOOLS" "$(TOOLS)"
	@printf "\033[32m%-18s\033[0m %s\n" "EMFC" "$(EMFC)"
	@printf "\033[32m%-18s\033[0m %s\n" "FORTRAN_WASM_LIB" "$(FORTRAN_WASM_LIB)"
	@printf "\033[32m%-18s\033[0m %s\n" "PWD" "$(PWD)"
	@printf "\033[32m%-18s\033[0m %s\n" "MAKE" "$(MAKE)"
