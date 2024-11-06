WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

R_VERSION = $(shell cat R-VERSION)
export R_VERSION

R_TARBALL = $(DOWNLOAD)/R-$(R_VERSION).tar.gz
R_SOURCE = $(BUILD)/R-$(R_VERSION)
R_URL = https://cran.rstudio.com/src/base/R-4/R-$(R_VERSION).tar.gz

R_HOST = $(HOST)/R-$(R_VERSION)
R_WASM = $(WASM)/R-$(R_VERSION)
R_WASM_TMP := $(R_WASM)/tmp

# Configure your local environment in this file
-include ~/.webr-config.mk
export WEBR_REPO
export WEBR_LIB

NPROCS ?= 1
WASM_OPT ?= -Oz

.PHONY: R
R: $(BUILD)/state/R-$(R_VERSION)/r-stage2

$(R_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(R_URL) -O $@

$(BUILD)/state/R-$(R_VERSION)/r-patched: $(R_TARBALL)
	rm -rf $(R_SOURCE)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(R_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/R-$(R_VERSION)/." "$(R_SOURCE)/patches"
	cd "$(R_SOURCE)/patches" && quilt push -a
	mkdir -p $(BUILD)/state/R-$(R_VERSION)
	touch $@

# Stage 1: Build a native version of R so we can compile the default packages
STAGE1_CC ?= clang
STAGE1_CXX ?= clang++
STAGE1_FC ?= gfortran

$(BUILD)/state/R-$(R_VERSION)/r-stage1-configured: $(BUILD)/state/R-$(R_VERSION)/r-patched
	@mkdir -p $(R_SOURCE)/build-stage1/doc
# Workaround for the lack of LaTeX packages
	cd $(R_SOURCE)/build-stage1/doc && \
	  touch NEWS NEWS.pdf NEWS.rds NEWS.2.rds NEWS.3.rds
	cd $(R_SOURCE)/build-stage1 && \
	  FC="$(STAGE1_FC)" \
	  CXX="$(STAGE1_CXX)" \
	  CC="$(STAGE1_CC)" \
	  CPPFLAGS="$(STAGE1_CPPFLAGS)" \
	  CFLAGS="$(STAGE1_CFLAGS)" \
	  LDFLAGS="$(STAGE1_LDFLAGS)" \
	  LIBnn="lib" \
	  ../configure \
	    --prefix="$(R_HOST)" \
	    --with-x=no \
	    --with-aqua=no \
	    --with-readline=no \
	    --with-static-cairo=yes \
	    --disable-openmp \
	    --with-recommended-packages=no \
	    --enable-R-profiling=no \
	    --with-pcre2 \
	    --disable-nls \
	    --enable-byte-compiled-packages=no \
	    --enable-long-double=no \
	    --enable-R-shlib
	touch $@

$(BUILD)/state/R-$(R_VERSION)/r-stage1: $(BUILD)/state/R-$(R_VERSION)/r-stage1-configured
	cd $(R_SOURCE)/build-stage1 && \
	  $(MAKE) -j $(NPROCS) R && \
	  $(MAKE) install
	touch $@

# Stage 2: Reconfigure and build for wasm32-unknown-emscripten target
STAGE2_BUILD = $(R_SOURCE)/build

STAGE2_CPPFLAGS := $(STAGE2_CPPFLAGS)
STAGE2_CPPFLAGS += -I$(WASM)/include
STAGE2_CPPFLAGS += -s WASM_BIGINT
STAGE2_CPPFLAGS += -fwasm-exceptions
STAGE2_CPPFLAGS += -s SUPPORT_LONGJMP=wasm
STAGE2_CPPFLAGS += -s USE_BZIP2=1
STAGE2_CPPFLAGS += -s USE_ZLIB=1
STAGE2_CPPFLAGS += -s USE_FREETYPE=1

STAGE2_CFLAGS := $(STAGE2_CFLAGS)
STAGE2_CFLAGS += $(WASM_OPT)
STAGE2_CFLAGS += -fPIC

STAGE2_LDFLAGS := $(STAGE2_LDFLAGS)
STAGE2_LDFLAGS += $(WASM_OPT)
STAGE2_LDFLAGS += -L$(WASM)/lib
STAGE2_LDFLAGS += -sWASM_BIGINT
STAGE2_LDFLAGS += -fwasm-exceptions
STAGE2_LDFLAGS += -s SUPPORT_LONGJMP=wasm

STAGE2_FFLAGS := $(STAGE2_FFLAGS)
STAGE2_FFLAGS += --target=wasm32-unknown-emscripten
STAGE2_FFLAGS += -O2
STAGE2_FFLAGS += -fPIC

# This is symlinked at configure-time
include $(TOOLS)/fortran.mk

EXPORTED_RUNTIME_METHODS=[$\
  'ENV',$\
  'FS',$\
  'GOT',$\
  'UTF8ToString',$\
  'addFunction',$\
  'allocateUTF8',$\
  'allocateUTF8OnStack',$\
  'callMain',$\
  'getValue',$\
  'getWasmTableEntry',$\
  'setValue'$\
]

MAIN_LDFLAGS := -s MAIN_MODULE=1
MAIN_LDFLAGS += -s ALLOW_MEMORY_GROWTH=1
MAIN_LDFLAGS += -s STACK_SIZE=1MB
MAIN_LDFLAGS += -s DECLARE_ASM_MODULE_EXPORTS=0
MAIN_LDFLAGS += -s ERROR_ON_UNDEFINED_SYMBOLS=0
MAIN_LDFLAGS += -s EXPORTED_RUNTIME_METHODS=$(EXPORTED_RUNTIME_METHODS)
MAIN_LDFLAGS += -s FETCH=1
MAIN_LDFLAGS += -lworkerfs.js -lnodefs.js -lidbfs.js

MAIN_LDFLAGS_ADD := --embed-file "$(R_WASM_TMP)/lib@/usr/lib"
MAIN_LDFLAGS_ADD += --use-preload-plugins

ifdef WEBR_REPO
MAIN_LDFLAGS_ADD += --preload-file "${WEBR_REPO}@/repo"
endif
ifdef WEBR_LIB
MAIN_LDFLAGS_ADD += --preload-file "${WEBR_LIB}@/usr/lib/R/library"
endif

SHLIB_LDFLAGS := -s SIDE_MODULE=1

$(BUILD)/state/R-$(R_VERSION)/r-stage2-configured: $(BUILD)/state/R-$(R_VERSION)/r-patched $(FORTRAN_WASM_LIB)
	@mkdir -p $(R_SOURCE)/build
	@cp $(TOOLS)/shims/pkg-config $(HOST)/bin/pkg-config
	@chmod +x $(HOST)/bin/pkg-config
	cd $(R_SOURCE)/build && \
	  PKG_CONFIG="$(HOST)/bin/pkg-config" \
	  EM_PKG_CONFIG="$(shell which pkg-config)" \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  MAIN_LDFLAGS="$(MAIN_LDFLAGS)" \
	  SHLIB_LDFLAGS="$(SHLIB_LDFLAGS)" \
	  CPPFLAGS="$(STAGE2_CPPFLAGS)" \
	  CFLAGS="$(STAGE2_CFLAGS)" \
	  LDFLAGS="$(STAGE2_LDFLAGS)" \
	  LIBnn="lib" \
	  FFLAGS="$(STAGE2_FFLAGS)" \
	  FCLIBS="$(FORTRAN_WASM_LDADD)" \
	  FC="$(EMFC)" \
	  emconfigure ../configure \
	    ac_cv_have_decl_sigaltstack=no \
	    ac_cv_have_decl_wcsftime=no \
	    ac_cv_have_decl_getrusage=no \
	    ac_cv_have_decl_getrlimit=no \
	    ac_cv_have_decl_umask=no \
	    r_cv_search_pthread_kill=no \
	    --prefix="$(R_WASM)" \
	    --with-x=no \
	    --with-readline=no \
		--with-libdeflate-compression=no \
	    --with-static-cairo=yes \
	    --disable-openmp \
	    --with-recommended-packages=no \
	    --enable-R-profiling=no \
	    --with-pcre2 \
	    --disable-nls \
	    --enable-static=yes \
	    --host=wasm32-unknown-emscripten \
	    --with-internal-tzcode
	touch $@

MAKE_WASM := $(MAKE)
MAKE_WASM += MAIN_LDFLAGS="$(MAIN_LDFLAGS) $(MAIN_LDFLAGS_ADD)"
MAKE_WASM += R_EXE="$(R_HOST)/bin/R --vanilla --no-echo"
MAKE_WASM += R_INSTALL_LIBRARY="$(STAGE2_BUILD)/library"
MAKE_WASM += R_ENABLE_JIT="false"
MAKE_WASM += WEBR_HOST_METHODS="$(R_HOST)/lib/R/library/methods"

$(BUILD)/state/R-$(R_VERSION)/r-stage2: $(BUILD)/state/R-$(R_VERSION)/r-stage1 $(BUILD)/state/R-$(R_VERSION)/r-stage2-configured
# Ensure that at least one file exists for embedding at /usr/lib
	@mkdir -p "$(R_WASM_TMP)/lib/R/etc"
	@touch "$(R_WASM_TMP)/lib/R/etc/Renviron"
	cd $(WEBR_ROOT)/packages && \
	  $(MAKE_WASM) clean && $(MAKE_WASM) all
# Remove repeated link flags, leads to duplicate symbol error with Emscripten
	sed -i.bak -e ':m' -e 's/-lz//2' -e 't m' -e ':n' -e 's/-lpng16//2' -e 't n' \
	  $(R_SOURCE)/build/src/library/grDevices/src/cairo/Makefile
	rm $(R_SOURCE)/build/src/library/grDevices/src/cairo/Makefile.bak
	cd $(STAGE2_BUILD) && $(MAKE_WASM) -j $(NPROCS) R
	mkdir -p $(R_SOURCE)/build/doc
	cd $(R_SOURCE)/build/doc && touch NEWS.pdf R.1 Rscript.1
	cd $(R_SOURCE)/build && $(MAKE_WASM) -j $(NPROCS) docs
	cd $(R_SOURCE)/build && $(MAKE_WASM) install
# Redirect $(WASM)/lib R binaries to $(HOST)/lib R binaries
	@mv $(R_WASM)/lib/R/bin/R $(R_WASM)/lib/R/bin/R.orig
	@mv $(R_WASM)/lib/R/bin/Rscript $(R_WASM)/lib/R/bin/Rscript.orig
	@cp $(R_HOST)/lib/R/bin/R $(R_WASM)/lib/R/bin/R
	@cp $(R_HOST)/lib/R/bin/Rscript $(R_WASM)/lib/R/bin/Rscript
	@touch $@

.PHONY: Rprofile
Rprofile: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	mkdir -p "$(R_WASM)/lib/R/etc/"
	echo "options(expressions=400)" > "$(R_WASM)/lib/R/etc/Rprofile.site"
	echo "options(bitmapType='cairo')" >> "$(R_WASM)/lib/R/etc/Rprofile.site"

.PHONY: install
install:
	@mkdir -p $(DIST)
	$(MAKE) vfs
	@cp "$(R_SOURCE)/build/src/main/R.wasm" "$(DIST)/R.wasm"
	@cat $(R_WASM)/pre.js $(R_SOURCE)/build/src/main/R.bin > $(DIST)/R.bin.js
# Patch Emscripten library to redirect a warning message to console.warn()
	@sed -i.bak 's/out("LazyFiles/console.warn("LazyFiles/' $(DIST)/R.bin.js
	@rm $(DIST)/R.bin.js.bak

# Build lazy virtual filesystem, backed by XHR when loaded in browsers
WASM_LAZY_VFS := $(WASM_LAZY_VFS)
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/doc@/usr/lib/R/doc"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/library/grDevices/libs/cairo.so@/usr/lib/R/library/grDevices/libs"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/library/parallel@/usr/lib/R/library/parallel"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/library/tcltk@/usr/lib/R/library/tcltk"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/library/translations/DESCRIPTION@/usr/lib/R/library/translations"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/library/translations@/usr/lib/R/library/translations"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/share@/usr/lib/R/share"
WASM_LAZY_VFS += -i "$(R_WASM)/lib/R/tests@/usr/lib/R/tests"

# Include extra R package data not included in the base virtual filesystem
PKG_DEFS := base compiler datasets grDevices graphics grid methods splines stats stats4 tools utils webr
PKG_DIRS := afm demo enc doc fonts help html misc tests
WASM_LAZY_VFS += $(foreach pkg,$(PKG_DEFS),$(foreach dir,$(PKG_DIRS),\
  -i "$(R_WASM)/lib/R/library/$(pkg)/$(dir)@/usr/lib/R/library/$(pkg)/$(dir)"))

# Include extra directories registered by wasm libraries
include $(WEBR_ROOT)/libs/recipes/**/targets.mk

.PHONY: vfs
vfs: Rprofile
	@rm -rf "$(R_WASM_TMP)" && mkdir -p "$(R_WASM_TMP)/lib/R/"
	@cp -a "$(R_WASM)/lib/R/library" "$(R_WASM_TMP)/lib/R/"
	@cp -a "$(R_WASM)/lib/R/etc" "$(R_WASM_TMP)/lib/R/"
	@cp -a "$(R_WASM)/lib/R/modules" "$(R_WASM_TMP)/lib/R/"
	@rm -r "$(R_WASM_TMP)/lib/R/library/translations"
	@rm -r "$(R_WASM_TMP)/lib/R/library/tcltk"
	@rm -r "$(R_WASM_TMP)/lib/R/library/parallel"
	@rm -rf "$(R_WASM_TMP)/lib/R/library/grDevices/libs/cairo.so"
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'afm' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'demo' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'enc' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'doc' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'fonts' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'help' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'html' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'misc' -exec rm -r "{}" +
	@find "$(R_WASM_TMP)/lib/R" -type d -name 'tests' -exec rm -r "{}" +
	@cp "$(R_WASM)/lib/R/lib/libRblas.so" "$(DIST)/libRblas.so"
	@cp "$(R_WASM)/lib/R/lib/libRlapack.so" "$(DIST)/libRlapack.so"
	@echo "Building lazy virtual filesystem:"
	$(R_HOST)/bin/Rscript $(TOOLS)/lzfs.R -v -d $(DIST)/vfs -u vfs \
	  $(WASM_LAZY_VFS) -o $(R_WASM)/pre.js
	@echo "Embedding base virtual filesystem:"
	@rm -f "$(R_SOURCE)/build/src/main/R.bin"
	cd $(STAGE2_BUILD)/src/main && $(MAKE_WASM) R

.PHONY: rebuild-extra-pkgs rebuild-core rebuild-modules
rebuild-extra-pkgs:
	$(MAKE) R
	$(MAKE) install

rebuild-core:
	cd $(STAGE2_BUILD)/src/unix && $(MAKE_WASM)
	$(MAKE) install

rebuild-modules:
	cd $(STAGE2_BUILD)/src/modules && $(MAKE_WASM)
	$(MAKE) install

.PHONY: clean
clean:
	rm -rf $(BUILD) $(DOWNLOAD)

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
