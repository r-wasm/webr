WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

DRAGONEGG_LIB = $(HOST)/lib/dragonegg.so
GFORTRAN_WASM_LIB = $(WASM)/lib/libgfortran.a
EMFC = $(TOOLS)/emfc

.PHONY: all
all: $(DRAGONEGG_LIB) $(GFORTRAN_WASM_LIB) $(EMFC)

$(DRAGONEGG_LIB):
	cd $(TOOLS)/dragonegg && $(MAKE) && $(MAKE) install

$(GFORTRAN_WASM_LIB):
	cd $(TOOLS)/libgfortran && $(MAKE) && $(MAKE) install

$(EMFC):
	sed -e "s|@LIB_PATH@|$(HOST)/lib|" emfc.in > $(EMFC)
