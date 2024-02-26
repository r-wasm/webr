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
WASM_LDFLAGS += $(WASM_OPT)
WASM_LDFLAGS += -fwasm-exceptions
WASM_LDFLAGS += -s SUPPORT_LONGJMP=wasm

export CPPFLAGS = $(WASM_CPPFLAGS)
export CFLAGS = $(WASM_CFLAGS)
export CXXFLAGS = $(WASM_CXXFLAGS)
export LDFLAGS = $(WASM_LDFLAGS)
export EM_PKG_CONFIG_PATH = $(WASM)/lib/pkgconfig

include recipes/**/targets.mk
include recipes/**/rules.mk

DEFAULT_WASM_BINS_INST = $(patsubst %, $(HOST)/bin/%, $(DEFAULT_WASM_BINS))
OPTIONAL_WASM_BINS_INST = $(patsubst %, $(HOST)/bin/%, $(OPTIONAL_WASM_BINS))

.PHONY: default
default: $(DEFAULT_WASM_LIBS) $(DEFAULT_WASM_BINS_INST)
.DEFAULT_GOAL := default

.PHONY: all
all: default $(OPTIONAL_WASM_LIBS) $(OPTIONAL_WASM_BINS_INST) fonts

$(EM_PKG_CONFIG_PATH)/%.pc: recipes/**/%.pc
	mkdir -p $(EM_PKG_CONFIG_PATH)
	cp "$<" "$@"

$(HOST)/bin/%: $(WASM)/bin/%
	@cp "$<" "$@"

$(DEFAULT_WASM_BINS_INST): $(DEFAULT_WASM_LIBS)
$(OPTIONAL_WASM_BINS_INST): $(OPTIONAL_WASM_LIBS)

.PHONY: clean-bins
clean-bins:
	rm -rf $(DEFAULT_WASM_BINS_INST) $(OPTIONAL_WASM_BINS_INST)

.PHONY: clean
clean:
	$(MAKE) clean-bins
	rm -rf $(DOWNLOAD) $(BUILD)
	rm -f $(DEFAULT_WASM_LIBS)
	rm -f $(OPTIONAL_WASM_LIBS)
	rm -f $(EM_PKG_CONFIG_PATH)/*.pc

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
