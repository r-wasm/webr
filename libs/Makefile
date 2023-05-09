WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
FONTS = $(DOWNLOAD)/fonts
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

export EM_PKG_CONFIG_PATH = $(WASM)/lib/pkgconfig

WASM_OPT ?= -Oz
WASM_OPT_LDADD ?= $(WASM_OPT)

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += -fPIC -fno-exceptions -fno-rtti $(WASM_OPT)
WASM_CFLAGS += -s USE_BZIP2=1 -s USE_ZLIB=1

include recipes/cairo.mk
include recipes/fontconfig.mk
include recipes/fonts.mk
include recipes/openssl.mk
include recipes/pcre.mk
include recipes/pixman.mk
include recipes/png.mk
include recipes/xml2.mk
include recipes/xz.mk

all: $(DEFAULT_WASM_LIBS) $(WASM)/usr/share/fonts
.DEFAULT_GOAL := all

$(EM_PKG_CONFIG_PATH)/%.pc: %.pc
	mkdir -p $(EM_PKG_CONFIG_PATH)
	cp "$<" "$@"

.PHONY: clean
clean:
	rm -rf $(DOWNLOAD) $(BUILD)
	rm -f $(DEFAULT_WASM_LIBS)

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
