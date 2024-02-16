#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>
#include "decl/webr-decl.h"

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

struct safe_eval_data {
  SEXP call;
  SEXP env;
};

SEXP ffi_safe_eval(SEXP call, SEXP env) {
  // Unprotected in the R_UnwindProtect cleanup callback
  SEXP data = PROTECT(Rf_allocVector(RAWSXP, sizeof(struct safe_eval_data)));

  struct safe_eval_data* ctx = (struct safe_eval_data *) RAW(data);
  ctx->call = call;
  ctx->env = env;

  // Unprotected in the R_UnwindProtect cleanup callback
  SEXP cont = PROTECT(R_MakeUnwindCont());
  SEXP res = R_UnwindProtect(safe_eval_body, data, safe_eval_cleanup, cont, cont);
  return res;
}

static
SEXP safe_eval_body(void* data) {
  struct safe_eval_data* ctx = (struct safe_eval_data *) RAW(data);
  return Rf_eval(ctx->call, ctx->env);
}

static
void safe_eval_cleanup(void* cdata, Rboolean jump) {
#ifdef __EMSCRIPTEN__
  UNPROTECT(2);
  if (jump) {
    EM_ASM({
      throw new globalThis.Module.webr.UnwindProtectException(
        'A non-local transfer of control occurred during evaluation',
        $0
      );
    }, cdata);
  }
#else
    Rf_error("Function must be running under Emscripten.");
#endif
}
