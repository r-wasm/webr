#ifndef WEBR_H
#define WEBR_H

#include <Rinternals.h>

SEXP ffi_eval_js(SEXP code, SEXP await);
SEXP ffi_safe_eval(SEXP call, SEXP env);

#endif
