#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

SEXP ffi_mount_workerfs(SEXP base_url, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  if (!Rf_isString(base_url) || LENGTH(base_url) != 1) {
    Rf_error("URL must be a character string.");
  }
  
  if (STRING_ELT(base_url, 0) == NA_STRING){
    Rf_error("URL can't be `NA`.");
  }

  if (!Rf_isString(mountpoint) || LENGTH(mountpoint) != 1) {
    Rf_error("`mountpoint` must be a character string.");
  }
  
  if (STRING_ELT(mountpoint, 0) == NA_STRING){
    Rf_error("`mountpoint` can't be `NA`.");
  }

  EM_ASM({
    const baseUrl = UTF8ToString($0);
    const mountpoint = UTF8ToString($1);
    const dataResp = Module.downloadFileContent(`${baseUrl}.data`);
    const metaResp = Module.downloadFileContent(`${baseUrl}.js.metadata`);

    if (dataResp.status < 200 || dataResp.status >= 300 ||
        metaResp.status < 200 || metaResp.status >= 300) {
      const msg = Module.allocateUTF8OnStack(
        'Unable to download Emscripten filesystem image. ' +
        'See the JavaScript console for further details.'
      );
      Module._Rf_error(msg);
    }

    const blob = new Blob([dataResp.response]);
    const metadata = JSON.parse(new TextDecoder().decode(metaResp.response));
    Module.FS.mount(Module.FS.filesystems.WORKERFS, {
      packages: [{ metadata, blob }],
    }, mountpoint);
  }, R_CHAR(STRING_ELT(base_url, 0)), R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}

SEXP ffi_mount_nodefs(SEXP path, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  if (!Rf_isString(path) || LENGTH(path) != 1) {
    Rf_error("`path` must be a character string.");
  }
  
  if (STRING_ELT(path, 0) == NA_STRING){
    Rf_error("`path` must not be `NA`.");
  }
  
  if (!Rf_isString(mountpoint) || LENGTH(mountpoint) != 1) {
    Rf_error("`mountpoint` must be a character string.");
  }
  
  if (STRING_ELT(mountpoint, 0) == NA_STRING){
    Rf_error("`mountpoint` must not be `NA`.");
  }

  EM_ASM({
    // Stop if we're not able to use a NODEFS filesystem object
    if (typeof IN_NODE === 'boolean' && IN_NODE === false) {
      const msg = Module.allocateUTF8OnStack(
        'The `NODEFS` filesystem object can only be used when running in Node.'
      );
      Module._Rf_error(msg);
    }
    const root = UTF8ToString($0);
    const mountpoint = UTF8ToString($1);
    Module.FS.mount(Module.FS.filesystems.NODEFS, { root }, mountpoint);
  }, R_CHAR(STRING_ELT(path, 0)), R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}

SEXP ffi_unmount(SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  if (!Rf_isString(mountpoint) || LENGTH(mountpoint) != 1) {
    Rf_error("`mountpoint` must be a character string.");
  }

  if (STRING_ELT(mountpoint, 0) == NA_STRING){
    Rf_error("`mountpoint` must not be `NA`.");
  }

  EM_ASM({
    try {
      Module.FS.unmount(UTF8ToString($0));
    } catch (e) {
      // Catch an Emscripten FS error - perhaps directory is not a mountpoint?
      if (e.name === 'ErrnoError') {
        const msg = Module.allocateUTF8OnStack(
          `${e.name}: ${e.message} ${e.errno}.`
        );
        Module._Rf_error(msg);
      } else {
        throw e;
      }
    }
  }, R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}
