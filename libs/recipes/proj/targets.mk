PROJ_WASM_LIB = $(WASM)/lib/libproj.a
OPTIONAL_WASM_LIBS += $(PROJ_WASM_LIB)
WASM_LAZY_VFS += -f "$(WASM)/share/proj@/usr/share/proj"
