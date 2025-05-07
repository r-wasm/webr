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

#define CHECK_LOGICAL(arg) \
  if (!Rf_isLogical(arg) || LENGTH(arg) != 1) {          \
    Rf_error("`" #arg "` must be a logical.");           \
  }                                                      \
  if (LOGICAL(arg)[0] == NA_LOGICAL){                    \
    Rf_error("`" #arg "` can't be `NA`.");               \
  }

SEXP ffi_mount_workerfs(SEXP source, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(source);
  CHECK_STRING(mountpoint);

  EM_ASM({
    const source = UTF8ToString($0);
    const mountpoint = UTF8ToString($1);
    try {
      if (ENVIRONMENT_IS_NODE && !/^https?:/.test(source)) {
        Module.mountImagePath(source, mountpoint);
      } else {
        Module.mountImageUrl(source, mountpoint);
      }
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

SEXP ffi_mount_idbfs(SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(mountpoint);

  EM_ASM({
    // Stop if we're not able to use a IDBFS filesystem object
    if (typeof IN_NODE === 'boolean' && IN_NODE === true) {
      const msg = Module.allocateUTF8OnStack(
        'The `IDBFS` filesystem object can only be used when running in a web browser.'
      );
      Module._Rf_error(msg);
    }
    const mountpoint = UTF8ToString($0);
    try {
      Module.FS.mount(Module.FS.filesystems.IDBFS, {}, mountpoint);
    } catch (e) {
      let msg = e.message;
      if (e.name === "ErrnoError" && e.errno === 10) {
        const dir = Module.UTF8ToString($0);
        msg = "Unable to mount directory, `" + dir + "` is already mounted.";
      }
      Module._Rf_error(Module.allocateUTF8OnStack(msg));
    }
  }, R_CHAR(STRING_ELT(mountpoint, 0)));

  return R_NilValue;
#else
  Rf_error("Function must be running under Emscripten.");
#endif
}

SEXP ffi_mount_drivefs(SEXP source, SEXP mountpoint) {
#ifdef __EMSCRIPTEN__
  CHECK_STRING(source);
  CHECK_STRING(mountpoint);

  EM_ASM({
    const driveName = UTF8ToString($0);
    const mountpoint = UTF8ToString($1);
    try {
      Module.mountDriveFS(driveName, mountpoint);
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

SEXP ffi_syncfs(SEXP populate) {
#ifdef __EMSCRIPTEN__
  CHECK_LOGICAL(populate);
  EM_ASM({ Module.FS.syncfs($0, () => {}) }, LOGICAL(populate)[0]);
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
