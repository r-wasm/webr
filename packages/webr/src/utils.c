#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>

SEXP r_obj_address(SEXP x) {
  static char buf[100];
  snprintf(buf, 100, "%p", (void*) x);
  return Rf_mkChar(buf);
}

SEXP ffi_obj_address(SEXP x) {
  SEXP str = PROTECT(r_obj_address(x));
  SEXP out = Rf_ScalarString(str);
  UNPROTECT(1);
  return out;
}
