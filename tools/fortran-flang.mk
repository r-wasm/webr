EMFC = $(HOST)/bin/flang-new

FORTRAN_WASM_LIB = $(WASM)/lib/libFortranRuntime.a
FORTRAN_WASM_LDADD = -L$(WASM)/lib -lFortranRuntime

$(EMFC) $(FORTRAN_WASM_LIB): $(TOOLS)/flang/Makefile
	cd $(TOOLS)/flang && \
	  $(MAKE) PREFIX=$(WEBR_ROOT) && \
	  $(MAKE) PREFIX=$(WEBR_ROOT) install

$(TOOLS)/flang/Makefile:
	git submodule update --init

.PHONY: flang-submodule
flang-submodule: $(TOOLS)/flang/Makefile

.PHONY: clean-tools
clean-tools:
	rm -rf $(TOOLS)/flang && mkdir $(TOOLS)/flang
