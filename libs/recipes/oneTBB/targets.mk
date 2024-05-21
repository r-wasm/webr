ONETBB_WASM_LIB = $(WASM)/lib/libtbb.a $(WASM)/lib/libtbbmalloc.a
OPTIONAL_WASM_LIBS += $(ONETBB_WASM_LIB)
WASM_LAZY_VFS += -i "$(WASM)/include/tbb@/usr/include/tbb"
WASM_LAZY_VFS += -i "$(WASM)/include/oneapi@/usr/include/oneapi"
