FC_WASM_LIB = $(WASM)/lib/libfontconfig.a
FC_DEPS = $(FC_WASM_LIB) $(EM_PKG_CONFIG_PATH)/fontconfig.pc

DEFAULT_WASM_LIBS += $(FC_WASM_LIB)
