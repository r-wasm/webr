WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

FLANG_BIN = $(HOST)/bin/tco $(HOST)/bin/bbc
FORTRAN_RUNTIME_WASM_LIB = $(WASM)/lib/libFortranRuntime.a
EMFC = $(TOOLS)/emfc

.PHONY: all
all: $(FLANG_BIN) $(GFORTRAN_WASM_LIB) $(EMFC)

$(FLANG_BIN) $(FORTRAN_RUNTIME_WASM_LIB):
	cd $(TOOLS)/flang && $(MAKE) && $(MAKE) install

$(EMFC):
	sed -e "s|@BIN_PATH@|$(HOST)/bin|" emfc.in > $(EMFC)
