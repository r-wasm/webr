#include <Rinternals.h>
#include <R_ext/Rdynload.h>

extern SEXP ffi_eval_js(SEXP code);
extern SEXP ffi_is_reference(SEXP code);
extern SEXP ffi_obj_address(SEXP x);
extern SEXP ffi_new_output_connections();

static
const R_CallMethodDef CallEntries[] = {
  { "ffi_eval_js",                (DL_FUNC) &ffi_eval_js,                1},
  { "ffi_is_reference",           (DL_FUNC) &ffi_is_reference,           2},
  { "ffi_obj_address",            (DL_FUNC) &ffi_obj_address,            1},
  { "ffi_new_output_connections", (DL_FUNC) &ffi_new_output_connections, 0},
  { NULL,                         NULL,                                  0}
};

void R_init_webr(DllInfo *dll) {
  R_registerRoutines(dll, NULL, CallEntries, NULL, NULL);
  R_useDynamicSymbols(dll, FALSE);
}
