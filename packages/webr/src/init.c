#include <Rinternals.h>
#include <R_ext/Rdynload.h>

extern SEXP ffi_eval_js(SEXP);
extern SEXP ffi_obj_address(SEXP);
extern SEXP ffi_new_output_connections(void);
extern SEXP ffi_dev_canvas(SEXP, SEXP, SEXP, SEXP);

static
const R_CallMethodDef CallEntries[] = {
  { "ffi_eval_js",                (DL_FUNC) &ffi_eval_js,                1},
  { "ffi_obj_address",            (DL_FUNC) &ffi_obj_address,            1},
  { "ffi_new_output_connections", (DL_FUNC) &ffi_new_output_connections, 0},
  { "ffi_dev_canvas",             (DL_FUNC) &ffi_dev_canvas,             4},
  { NULL,                         NULL,                                  0}
};

void R_init_webr(DllInfo *dll) {
  R_registerRoutines(dll, NULL, CallEntries, NULL, NULL);
  R_useDynamicSymbols(dll, FALSE);
}
