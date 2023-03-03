EMFC_DIR = $(WEBR_ROOT)/tools/flang
EMFC = $(WEBR_ROOT)/host/bin/emfc

FORTRAN_WASM_LIB = $(WASM)/lib/libFortranRuntime.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lFortranRuntime
