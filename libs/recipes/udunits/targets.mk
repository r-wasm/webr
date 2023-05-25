UDUNITS_WASM_LIB = $(WASM)/lib/libudunits2.a
OPTIONAL_WASM_LIBS += $(UDUNITS_WASM_LIB)
WASM_LAZY_VFS += -f "$(WASM)/share/udunits@/usr/share/udunits"
