WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

# This is symlinked at configure-time
include $(TOOLS)/fortran.mk

R_VERSION = $(shell cat R-VERSION)
export R_VERSION

R_TARBALL = $(DOWNLOAD)/R-$(R_VERSION).tar.gz
R_SOURCE = $(BUILD)/R-$(R_VERSION)
R_URL = https://cran.r-project.org/src/base/R-4/R-$(R_VERSION).tar.gz

R_HOST = $(HOST)/R-$(R_VERSION)
R_WASM = $(WASM)/R-$(R_VERSION)

# Configure your local environment in this file
-include ~/.webr-config.mk
export WEBR_REPO
export WEBR_LIB

WASM_OPT ?= -Oz
WASM_OPT_LDADD ?= $(WASM_OPT)
WASM_OPT_LDADD += -s DECLARE_ASM_MODULE_EXPORTS=0

WASM_CPPFLAGS := $(WASM_CPPFLAGS)
WASM_CPPFLAGS += -fwasm-exceptions
WASM_CPPFLAGS += -s SUPPORT_LONGJMP=wasm

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += $(WASM_OPT)
WASM_CFLAGS += -fPIC

WASM_LDFLAGS := $(WASM_LDFLAGS)
WASM_LDFLAGS += -fwasm-exceptions
WASM_LDFLAGS += -s SUPPORT_LONGJMP=wasm

.PHONY: all
all: R

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

STAGE1_CC ?= clang
STAGE1_CXX ?= clang++
STAGE1_FC ?= gfortran

# Stage 1: Build a native version of R so we can compile the default packages
$(BUILD)/state/R-$(R_VERSION)/r-stage1-configured: $(BUILD)/state/R-$(R_VERSION)/r-patched
	mkdir -p $(R_SOURCE)/build-stage1/doc
# Workaround for the lack of LaTeX packages
	cd $(R_SOURCE)/build-stage1/doc && \
	  touch NEWS NEWS.pdf NEWS.rds NEWS.2.rds NEWS.3.rds
	cd $(R_SOURCE)/build-stage1 && \
	  FC="$(STAGE1_FC)" \
	  CXX="$(STAGE1_CXX)" \
	  CC="$(STAGE1_CC)" \
	  FC="$(STAGE1_FC)" \
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
	    --enable-long-double=no
	touch $@

$(BUILD)/state/R-$(R_VERSION)/r-stage1: $(BUILD)/state/R-$(R_VERSION)/r-stage1-configured
	cd $(R_SOURCE)/build-stage1 && \
	  $(MAKE) R && \
	  $(MAKE) install
	touch $@

STAGE2_CPPFLAGS := $(STAGE2_CPPFLAGS)
STAGE2_CPPFLAGS += $(WASM_CPPFLAGS)
STAGE2_CPPFLAGS += -I$(WASM)/include
STAGE2_CPPFLAGS += -DEXPEL_OLD_TO_NEW=1
STAGE2_CPPFLAGS += -s USE_BZIP2=1
STAGE2_CPPFLAGS += -s USE_ZLIB=1
STAGE2_CPPFLAGS += -s USE_FREETYPE=1

STAGE2_CFLAGS := $(STAGE2_CFLAGS)
STAGE2_CFLAGS += $(WASM_CFLAGS)
STAGE2_CFLAGS += $(STAGE2_CPPFLAGS)

STAGE2_LDFLAGS := $(STAGE2_LDFLAGS)
STAGE2_LDFLAGS += $(WASM_LDFLAGS)
STAGE2_LDFLAGS += -L$(WASM)/lib
STAGE2_LDFLAGS +=-s USE_FREETYPE=1

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
  'setValue'$\
]

MAIN_LDFLAGS  = -s MAIN_MODULE=1
MAIN_LDFLAGS += -s WASM=1
MAIN_LDFLAGS += -s WASM_BIGINT
MAIN_LDFLAGS += -s ALLOW_MEMORY_GROWTH=1
MAIN_LDFLAGS += -s STACK_SIZE=1MB
MAIN_LDFLAGS += -s EXIT_RUNTIME=1
MAIN_LDFLAGS += -s ERROR_ON_UNDEFINED_SYMBOLS=0
MAIN_LDFLAGS += -s EXPORTED_FUNCTIONS=['getWasmTableEntry']
MAIN_LDFLAGS += -s EXPORTED_RUNTIME_METHODS=$(EXPORTED_RUNTIME_METHODS)
MAIN_LDFLAGS += -s FETCH=1
MAIN_LDFLAGS += $(FORTRAN_WASM_LDADD)
MAIN_LDFLAGS += $(WASM_OPT_LDADD)

SHLIB_LDFLAGS  = -s SIDE_MODULE=1
SHLIB_LDFLAGS += -s WASM_BIGINT $(WASM_OPT_LDADD)

# Stage 2: Reconfigure and build for wasm32-unknown-emscripten target
$(BUILD)/state/R-$(R_VERSION)/r-stage2-configured: $(BUILD)/state/R-$(R_VERSION)/r-patched $(FORTRAN_WASM_LIB)
	mkdir -p $(R_SOURCE)/build
	cd $(R_SOURCE)/build && \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  MAIN_LDFLAGS="$(MAIN_LDFLAGS)" \
	  SHLIB_LDFLAGS="$(SHLIB_LDFLAGS)" \
	  CPPFLAGS="$(STAGE2_CPPFLAGS)" \
	  CFLAGS="$(STAGE2_CFLAGS)" \
	  LDFLAGS="$(STAGE2_LDFLAGS)" \
	  LIBnn="lib" \
	  FFLAGS="" \
	  FPICFLAGS="-fPIC" \
	  FC="$(EMFC)" \
	  emconfigure ../configure \
	    --prefix="$(R_WASM)" \
	    --with-x=no \
	    --with-readline=no \
	    --with-static-cairo=yes \
	    --disable-openmp \
	    --with-recommended-packages=no \
	    --enable-R-profiling=no \
	    --with-pcre2 \
	    --disable-nls \
	    --enable-byte-compiled-packages=no \
	    --enable-static=yes \
	    --host=wasm32-unknown-emscripten \
	    --with-internal-tzcode
# Disable umask which doesn't work well within Emscripten. Fixes
# permission issues when extracting tarballs.
	sed -i.bak '/D\["HAVE_UMASK"\]/d' $(R_SOURCE)/build/config.status
# Disable some unsupported features when running under Emscripten
	sed -i.bak '/D\["HAVE_WCSFTIME"\]/d' $(R_SOURCE)/build/config.status
	sed -i.bak '/D\["HAVE_SIGALTSTACK"\]/d' $(R_SOURCE)/build/config.status
	sed -i.bak '/D\["HAVE_GETRUSAGE"\]/d' $(R_SOURCE)/build/config.status
	sed -i.bak '/D\["HAVE_GETRLIMIT"\]/d' $(R_SOURCE)/build/config.status
	rm $(R_SOURCE)/build/config.status.bak
	cd $(R_SOURCE)/build && ./config.status
	touch $@

STAGE2_BUILD = $(R_SOURCE)/build

MAKE_WASM := $(MAKE)
MAKE_WASM += R_EXE="$(R_HOST)/bin/R --vanilla --no-echo"

MAKE_WASM_BUILD := $(MAKE_WASM)
MAKE_WASM_BUILD += R_INSTALL_LIBRARY="$(STAGE2_BUILD)/library"
MAKE_WASM_BUILD += R_ENABLE_JIT="false"
MAKE_WASM_BUILD += WEBR_HOST_METHODS="$(R_HOST)/lib/R/library/methods"
MAKE_WASM_BUILD += FORTRAN_WASM_LDADD="$(FORTRAN_WASM_LDADD)"

MAKE_WASM_INSTALL := $(MAKE_WASM)

# Build lazy virtual filesystem, backed by XHR when loaded in browsers
WASM_LAZY_VFS := $(WASM_LAZY_VFS)
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/doc@/usr/lib/R/doc"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/library/grDevices/libs/cairo.so@/usr/lib/R/library/grDevices/libs"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/library/parallel@/usr/lib/R/library/parallel"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/library/tcltk@/usr/lib/R/library/tcltk"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/library/translations@/usr/lib/R/library/translations"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/share@/usr/lib/R/share"
WASM_LAZY_VFS += -f "$(R_WASM)/lib/R/tests@/usr/lib/R/tests"

# Include extra R package data not included in the base virtual filesystem
PKG_DEFS := base compiler datasets grDevices graphics grid methods splines stats stats4 tools utils
PKG_DIRS := afm demo enc doc fonts help html misc tests
WASM_LAZY_VFS += $(foreach pkg,$(PKG_DEFS),$(foreach dir,$(PKG_DIRS),\
  -f "$(R_WASM)/lib/R/library/$(pkg)/$(dir)@/usr/lib/R/library/$(pkg)/$(dir)"))

# Include extra directories registered by wasm libraries
include $(WEBR_ROOT)/libs/recipes/**/targets.mk
export VFSDIR = $(R_WASM)/dist/vfs
export LZFS = $(R_HOST)/bin/Rscript $(TOOLS)/lzfs.R
export WASM_LAZY_VFS

$(BUILD)/state/R-$(R_VERSION)/r-stage2: $(BUILD)/state/R-$(R_VERSION)/r-stage1 $(BUILD)/state/R-$(R_VERSION)/r-stage2-configured
	cd $(WEBR_ROOT)/packages && \
	  $(MAKE_WASM) clean && $(MAKE_WASM) all
# Remove repeated link flags, leads to duplicate symbol error with Emscripten
	sed -i.bak -e ':m' -e 's/-lz//2' -e 't m' -e ':n' -e 's/-lpng16//2' -e 't n' \
	  $(R_SOURCE)/build/src/library/grDevices/src/cairo/Makefile
	rm $(R_SOURCE)/build/src/library/grDevices/src/cairo/Makefile.bak
	cd $(STAGE2_BUILD) && \
	  $(MAKE_WASM_BUILD) R
	touch $@

.PHONY: Rprofile
Rprofile: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	mkdir -p "$(R_WASM)/lib/R/etc/"
	echo "options(expressions=400)" > "$(R_WASM)/lib/R/etc/Rprofile.site"
	echo "options(bitmapType='cairo')" >> "$(R_WASM)/lib/R/etc/Rprofile.site"

.PHONY: install
install: install-tests Rprofile
	mkdir -p $(R_SOURCE)/build/doc
	cd $(R_SOURCE)/build/doc && touch NEWS.pdf R.1 Rscript.1
	cd $(R_SOURCE)/build && \
	  $(MAKE_WASM_INSTALL) install-wasm
	cp -r "$(R_WASM)/dist/." $(DIST)

.PHONY: install-tests
install-tests: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	cd $(R_SOURCE)/build && \
	  $(MAKE_WASM_BUILD) docs && \
	  $(MAKE_WASM_INSTALL) install-tests

.PHONY: rebuild-extra-pkgs
rebuild-extra-pkgs: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	rm -f $(BUILD)/state/R-$(R_VERSION)/r-stage2
	cd $(WEBR_ROOT)/packages && \
	  $(MAKE_WASM) clean && $(MAKE_WASM) all
	cd $(STAGE2_BUILD)/src/main && \
	  $(MAKE_WASM_INSTALL) install-wasm
	cp -r "$(R_WASM)/dist/." $(DIST)

.PHONY: rebuild-core
rebuild-core: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	rm -f $(BUILD)/state/R-$(R_VERSION)/r-stage2
	cd $(STAGE2_BUILD)/src/unix && \
	  $(MAKE_WASM_BUILD)
	cd $(STAGE2_BUILD)/src/main && \
	  $(MAKE_WASM_BUILD) R && \
	  $(MAKE_WASM_INSTALL) install-wasm
	cp -r "$(R_WASM)/dist/." $(DIST)

.PHONY: rebuild-modules
rebuild-modules: $(BUILD)/state/R-$(R_VERSION)/r-stage2
	rm -f $(BUILD)/state/R-$(R_VERSION)/r-stage2
	cd $(STAGE2_BUILD)/src/modules && \
	  $(MAKE_WASM_BUILD) && \
	  $(MAKE_WASM_BUILD) install
	cd $(STAGE2_BUILD)/src/main && \
	  $(MAKE_WASM_BUILD) R && \
	  $(MAKE_WASM_INSTALL) install-wasm
	cp -r "$(R_WASM)/dist/." $(DIST)

.PHONY: clean
clean:
	rm -rf $(BUILD) $(DOWNLOAD)

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
