WEBR_ROOT = $(abspath ..)
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm
TOOLS = $(WEBR_ROOT)/tools
BUILD = $(WEBR_ROOT)/R/build

ifndef R_VERSION
  $(error R_VERSION is undefined)
endif

R_SOURCE = $(BUILD)/R-${R_VERSION}
R_HOST_EXE = $(HOST)/R-${R_VERSION}/bin/R
R_WASM_LIB = $(WASM)/R-${R_VERSION}/lib/R/library

PKGS = webr
PKG_PATHS = $(patsubst %,$(R_WASM_LIB)/%,$(PKGS))
PKG_SRCS = $(shell find . -type f \! -path \*/.Rproj.user/\* -a \! -name .Rhistory)
PKG_OBJS = $(shell find . -mindepth 2 -type f -name \*.o -o -name \*.so)

all: $(PKG_PATHS)

$(R_WASM_LIB)/%: $(PKG_SRCS)
	@mkdir -p $(R_WASM_LIB)
	WASM_TOOLS="$(TOOLS)" \
	R_SOURCE="$(R_SOURCE)" \
	R_MAKEVARS_USER="$(WEBR_ROOT)/packages/webr-vars.mk" \
	$(R_HOST_EXE) CMD INSTALL --library="$(R_WASM_LIB)" $(notdir $@) \
	  --no-docs \
	  --no-test-load \
	  --no-staged-install \
	  --no-byte-compile

clean:
	rm -rf $(PKG_PATHS)
	rm -f $(PKG_OBJS)
