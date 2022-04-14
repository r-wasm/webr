WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

BUILD = $(ROOT)/build
WASM = $(WEBR_ROOT)/wasm

$(BUILD)/libgfortran.a:
	mkdir -p $(BUILD)
	( \
	  cd $(BUILD); \
	  emcc -fPIC -std=gnu11 -g -Os -c $(ROOT)/pow_i4_i4.c -o pow_i4_i4.o; \
	  emcc -fPIC -std=gnu11 -g -Os -c $(ROOT)/string_intrinsics_inc.c -o string_intrinsics_inc.o; \
	  rm -f libgfortran.a; \
	  emar -cr libgfortran.a pow_i4_i4.o string_intrinsics_inc.o; \
	)

.PHONY: install
install:
	mkdir -p $(WASM)/lib
	cp $(BUILD)/libgfortran.a $(WASM)/lib/

.PHONY: clean
clean:
	rm -f *.o *.a
