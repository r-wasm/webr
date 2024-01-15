NLOPT_VERSION = 2.7.1
NLOPT_TARBALL = $(DOWNLOAD)/nlopt-$(NLOPT_VERSION).tar.gz
NLOPT_URL = https://github.com/stevengj/nlopt/archive/refs/tags/v$(NLOPT_VERSION).tar.gz

.PHONY: nlopt
nlopt: $(NLOPT_WASM_LIB)

$(NLOPT_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(NLOPT_URL) -O $@

$(NLOPT_WASM_LIB): $(NLOPT_TARBALL)
	mkdir -p $(BUILD)/nlopt-$(NLOPT_VERSION)/build
	tar -C $(BUILD) -xf $(NLOPT_TARBALL)
	cd $(BUILD)/nlopt-$(NLOPT_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DNLOPT_GUILE=OFF \
	    -DNLOPT_MATLAB=OFF \
	    -DNLOPT_OCTAVE=OFF \
	    -DNLOPT_TESTS=OFF \
	    -DNLOPT_PYTHON=OFF \
	    -DNLOPT_SWIG=OFF \
	    .. && \
	  emmake make install


