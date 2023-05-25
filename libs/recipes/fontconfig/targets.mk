FC_WASM_LIB = $(WASM)/lib/libfontconfig.a
FC_DEPS = $(FC_WASM_LIB) $(EM_PKG_CONFIG_PATH)/fontconfig.pc
OPTIONAL_WASM_LIBS += $(FC_WASM_LIB)
WASM_LAZY_VFS += -f "$(WASM)/etc/fonts@/etc/fonts"
