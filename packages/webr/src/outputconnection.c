/*
 * Custom R connections for capturing output streams
 *
 * A custom R connection is created for both the stdout and stderr streams.
 * The connections are set up to store writes into a designated output vector,
 * tagged with the stream description. Writes to the connection are multiplexed
 * into the output vector, but the ordering of events is maintained.
 *
 * Each line of stream output is stored as a separate element in the output
 * vector. The writes are buffered and written out to a new element whenever a
 * newline character is sent to the connection.
 *
 * The source for the outputConnection output_ callback functions were
 * originally based on the dummy_ callbacks in R's /src/main/connections.c
 */

#define R_NO_REMAP

#include <R.h>
#include <Rinternals.h>
#include <R_ext/Connections.h>
#include "decl/outputconnection-decl.h"

SEXP ffi_new_output_connections() {
  Rconnection out_con_stdout;
  Rconnection out_con_stderr;

  const char *names[] = { "stdout", "stderr", "vec", "n", "" };
  SEXP out = PROTECT(Rf_mkNamed(VECSXP, names));
  SET_VECTOR_ELT(
    out, 0, R_new_custom_connection("stdout", "w", "outputConnection", &out_con_stdout)
  );
  SET_VECTOR_ELT(
    out, 1, R_new_custom_connection("stderr", "w", "outputConnection", &out_con_stderr)
  );
  SET_VECTOR_ELT(out, 2, Rf_allocVector(VECSXP, 0));
  SET_VECTOR_ELT(out, 3, Rf_ScalarInteger(0));

  init_output_connection(out_con_stdout, out);
  init_output_connection(out_con_stderr, out);

  UNPROTECT(1);
  return out;
}

#define BUFSIZE 10000
struct output_con_data {
  SEXP output;
  char buf[BUFSIZE];
  char *line, *cur;
};

static
void init_output_connection(Rconnection con, SEXP out) {
  con->open = &output_open;
  con->close = &output_close;
  con->vfprintf = &output_vfprintf;
  con->destroy = &output_destroy;
  con->canread = FALSE;
  con->canwrite = TRUE;
  con->isopen = TRUE;

  struct output_con_data *data = malloc(sizeof(struct output_con_data));
  data->output = out;
  data->cur = data->line = data->buf;
  con->private = data;
}

static
Rboolean output_open(Rconnection con) {
  con->isopen = TRUE;
  return TRUE;
}

static
void output_close(Rconnection con) {
  con->isopen = FALSE;
}

static
void output_destroy(Rconnection con) {
  if (con->private) {
    free(con->private);
  }
}

static
int output_vfprintf(Rconnection con, const char *format, va_list ap) {
  struct output_con_data *data = con->private;
  size_t curlen = data->cur - data->buf;

  va_list aq;
  va_copy(aq, ap);
  int res = vsnprintf(data->cur, BUFSIZE - curlen, format, aq);
  va_end(aq);

  if (res < 0) {
    data->cur[0] = '\0';
  } else if (res >= BUFSIZE - curlen) {
    Rf_warning("printing of extremely long output is truncated");
    data->buf[BUFSIZE - 1] = '\0';
    res = BUFSIZE - curlen - 1;
  }
  data->cur += res < 0 ? 0 : res;

  // Check for newlines in buffer and copy completed lines to output
  for (char *p = data->line; p < data->cur; p++) {
    if (*p == '\n') {
      *p = '\0';
      const char *names[] = { "type", "data", "" };
      SEXP elt = PROTECT(Rf_mkNamed(VECSXP, names));
      SET_VECTOR_ELT(elt, 0, Rf_mkString(con->description));
      SET_VECTOR_ELT(elt, 1, Rf_mkChar(data->line));

      SEXP vec = VECTOR_ELT(data->output, 2);
      int len = Rf_length(vec);
      int n = INTEGER_ELT(VECTOR_ELT(data->output, 3), 0);
      if (n >= len) {
        vec = Rf_lengthgets(vec, 2 * len + 1);
        SET_VECTOR_ELT(data->output, 2, vec);
      }
      SET_VECTOR_ELT(vec, n, elt);
      SET_INTEGER_ELT(VECTOR_ELT(data->output, 3), 0, n + 1);
      UNPROTECT(1);
      data->line = p + 1;
    }
  }

  // If we're not in the middle of a line, reset to start of buffer
  if (data->line == data->cur) {
    data->cur = data->line = data->buf;
  }
  return res;
}
