#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#define BUFSIZE 64
SEXP ffi_eval_js(SEXP code) {
#ifdef __EMSCRIPTEN__
  if (!Rf_isString(code) || LENGTH(code) != 1) {
    Rf_error("`code` must be a character string.");
  }

  if (STRING_ELT(code, 0) == NA_STRING){
    Rf_error("`code` must not be `NA`.");
  }

  const char *eval_template = "globalThis.Module.webr.evalJs(%p)";
  char eval_script[BUFSIZE];
  snprintf(eval_script, BUFSIZE, eval_template, R_CHAR(STRING_ELT(code, 0)));
  return Rf_ScalarInteger(emscripten_run_script_int(eval_script));
#else
    Rf_error("Function must be running under Emscripten.");
#endif
}
