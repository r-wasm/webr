#include <Rinternals.h>
#include <R_ext/Rdynload.h>
extern SEXP ffi_new_output_connections();
extern SEXP ffi_eval_js(SEXP code);

static
const R_CallMethodDef CallEntries[] = {
  { "ffi_new_output_connections", (DL_FUNC) &ffi_new_output_connections, 0},
  { "ffi_eval_js",                (DL_FUNC) &ffi_eval_js,                1},
  { NULL,                         NULL,                                  0}
};

void R_init_webr(DllInfo *dll) {
  R_registerRoutines(dll, NULL, CallEntries, NULL, NULL);
  R_useDynamicSymbols(dll, FALSE);
}
