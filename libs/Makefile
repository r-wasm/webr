WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
FONTS = $(DOWNLOAD)/fonts
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

EM_LIBS := -s USE_BZIP2=1
EM_LIBS += -s USE_ZLIB=1

WASM_OPT ?= -Oz
WASM_OPT_LDADD ?= $(WASM_OPT)

WASM_COMMON_FLAGS := $(WASM_OPT)
WASM_COMMON_FLAGS += -fPIC
WASM_COMMON_FLAGS += -fwasm-exceptions
WASM_COMMON_FLAGS += -s SUPPORT_LONGJMP=wasm

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += $(WASM_COMMON_FLAGS)

WASM_CXXFLAGS := $(WASM_CXXFLAGS)
WASM_CXXFLAGS += $(WASM_COMMON_FLAGS)

WASM_CPPFLAGS := $(WASM_CPPFLAGS)
WASM_CPPFLAGS += -I$(WASM)/include
WASM_CPPFLAGS += $(EM_LIBS)

WASM_LDFLAGS := $(WASM_LDFLAGS)
WASM_LDFLAGS += -L$(WASM)/lib
WASM_LDFLAGS += $(EM_LIBS)
WASM_LDFLAGS += -fwasm-exceptions
WASM_LDFLAGS += -s SUPPORT_LONGJMP=wasm

export CPPFLAGS = $(WASM_CPPFLAGS)
export CFLAGS = $(WASM_CFLAGS)
export CXXFLAGS = $(WASM_CXXFLAGS)
export LDFLAGS = $(WASM_LDFLAGS)
export EM_PKG_CONFIG_PATH = $(WASM)/lib/pkgconfig

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
