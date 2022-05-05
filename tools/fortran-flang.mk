EMFC_DIR = $(WEBR_ROOT)/tools/flang
EMFC = $(EMFC_DIR)/emfc

FORTRAN_WASM_LIB = $(WASM)/lib/libFortranRuntime.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lFortranRuntime
