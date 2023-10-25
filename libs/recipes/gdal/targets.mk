GDAL_WASM_LIB = $(WASM)/lib/libgdal.a
OPTIONAL_WASM_LIBS += $(GDAL_WASM_LIB)
WASM_LAZY_VFS += -i "$(WASM)/share/gdal@/usr/share/gdal"
