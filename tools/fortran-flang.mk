EMFC = $(HOST)/bin/flang-new

FORTRAN_WASM_LIB = $(WASM)/lib/libFortranRuntime.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lFortranRuntime

.PHONY: flang-submodule
flang-submodule:
	git submodule update --init

$(EMFC) $(FORTRAN_WASM_LIB): flang-submodule
	cd $(TOOLS)/flang && \
	  $(MAKE) PREFIX=$(WEBR_ROOT) && \
	  $(MAKE) PREFIX=$(WEBR_ROOT) install

.PHONY: clean-tools
clean-tools:
	rm -rf $(TOOLS)/flang && mkdir $(TOOLS)/flang
