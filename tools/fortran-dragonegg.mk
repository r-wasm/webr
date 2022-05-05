EMFC_DIR = $(WEBR_ROOT)/tools/dragonegg
EMFC = $(EMFC_DIR)/emfc

FORTRAN_WASM_LIB = $(WASM)/lib/libgfortran.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lgfortran
