
static
void init_output_connection(Rconnection con, SEXP out);

static
Rboolean output_open(Rconnection con);

static
void output_close(Rconnection con);

static
void output_destroy(Rconnection con);

static
int output_vfprintf(Rconnection con, const char *format, va_list ap);
