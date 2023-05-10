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

WASM_CPPFLAGS := WASM_CPPFLAGS
WASM_CPPFLAGS += -fwasm-exceptions

WASM_FLAGS := -fPIC
WASM_FLAGS += -s USE_BZIP2=1
WASM_FLAGS += -s USE_ZLIB=1
WASM_FLAGS += $(WASM_OPT)

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += $(WASM_FLAGS)

WASM_CXXFLAGS := $(WASM_CXXFLAGS)
WASM_CXXFLAGS += $(WASM_FLAGS)

WASM_LDFLAGS := $(WASM_LDFLAGS)
WASM_LDFLAGS += -fwasm-exceptions

include recipes/**/targets.mk
include recipes/**/rules.mk

all: $(DEFAULT_WASM_LIBS) $(WASM)/usr/share/fonts
.DEFAULT_GOAL := all

$(EM_PKG_CONFIG_PATH)/%.pc: recipes/**/%.pc
	mkdir -p $(EM_PKG_CONFIG_PATH)
	cp "$<" "$@"

.PHONY: clean
clean:
	rm -rf $(DOWNLOAD) $(BUILD)
	rm -f $(DEFAULT_WASM_LIBS)
	rm -f $(EM_PKG_CONFIG_PATH)/*.pc

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
