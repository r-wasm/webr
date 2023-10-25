PROJ_WASM_LIB = $(WASM)/lib/libproj.a
OPTIONAL_WASM_LIBS += $(PROJ_WASM_LIB)
WASM_LAZY_VFS += -i "$(WASM)/share/proj@/usr/share/proj"
