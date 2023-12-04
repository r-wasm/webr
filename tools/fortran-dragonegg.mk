EMFC = $(TOOLS)/dragonegg/emfc

FORTRAN_WASM_LIB = $(WASM)/lib/libgfortran.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lgfortran

$(EMFC) $(FORTRAN_WASM_LIB):
	cd $(TOOLS)/dragonegg && $(MAKE) && $(MAKE) install

.PHONY: clean-tools
clean-tools:
	cd $(TOOLS)/dragonegg && $(MAKE) clean
