#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#define CHECK_STRING(arg) \
  if (!Rf_isString(arg) || LENGTH(arg) != 1) {           \
    Rf_error("`" #arg "` must be a character string.");  \
  }                                                      \
  if (STRING_ELT(arg, 0) == NA_STRING){                  \
    Rf_error("`" #arg "` can't be `NA`.");               \
  }

SEXP ffi_mount_workerfs(SEXP source, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(source);
  CHECK_STRING(mountpoint);

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
    try {
      Module.FS.mount(Module.FS.filesystems.WORKERFS, {
        packages: [{ metadata, blob }],
      }, mountpoint);
    } catch (e) {
      let msg = e.message;
      if (e.name === "ErrnoError" && e.errno === 10) {
        const dir = Module.UTF8ToString($1);
        msg = "Unable to mount image, `" + dir + "` is already mounted.";
      }
      Module._Rf_error(Module.allocateUTF8OnStack(msg));
    }
  }, R_CHAR(STRING_ELT(source, 0)), R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}

SEXP ffi_mount_nodefs(SEXP source, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(source);
  CHECK_STRING(mountpoint);

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
    try {
      Module.FS.mount(Module.FS.filesystems.NODEFS, { root }, mountpoint);
    } catch (e) {
      let msg = e.message;
      if (e.name === "ErrnoError" && e.errno === 10) {
        const dir = Module.UTF8ToString($1);
        msg = "Unable to mount directory, `" + dir + "` is already mounted.";
      }
      Module._Rf_error(Module.allocateUTF8OnStack(msg));
    }
  }, R_CHAR(STRING_ELT(source, 0)), R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}

SEXP ffi_unmount(SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(mountpoint);

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
