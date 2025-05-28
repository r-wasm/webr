# https://github.com/Homebrew/homebrew-core/blob/cd71c6db511f368436d9b0bec570f282a4eb3d05/Formula/lib/libaec.rb#L23C3-L28C34
# link_overwrite "include/szlib.h"  (WASM_CPPFLAGS += -I$(WASM)/include) should be able to find?
# link_overwrite "lib/libsz.a"      (WASM_LDFLAGS += -L$(WASM)/lib) should be able to find?
# link_overwrite "lib/libsz.dylib"
# link_overwrite "lib/libsz.2.dylib"
# link_overwrite "lib/libsz.so"
# link_overwrite "lib/libsz.so.2"

LIBAEC_WASM_LIB = $(WASM)/lib/libsz.a
OPTIONAL_WASM_LIBS += $(LIBAEC_WASM_LIB)
