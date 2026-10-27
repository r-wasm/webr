#!/bin/sh
# Emit a Meson cross-file targeting Emscripten on stdout.
#
# Inputs (via environment):
#   CFLAGS, CXXFLAGS, CPPFLAGS, LDFLAGS   - whitespace-separated tokens
#
# Per-recipe additions (e.g. --use-port=freetype) should be appended to
# the relevant env var by the caller before invoking this script.
#
# Each whitespace-separated token is emitted as a single quoted element in
# the c_args / c_link_args list -- so multi-token flags like
# "-s SUPPORT_LONGJMP=wasm" must remain space-separated in the input.

set -eu

quote_list() {
    set -- $1
    if [ $# -eq 0 ]; then
        return 0
    fi
    printf "'%s'" "$1"
    shift
    for arg in "$@"; do
        printf ", '%s'" "$arg"
    done
}

cat <<EOF
[binaries]
c = 'emcc'
cpp = 'em++'
ar = 'emar'
ranlib = 'emranlib'
strip = 'emstrip'
pkg-config = 'pkg-config'

[built-in options]
c_args = [$(quote_list "${CPPFLAGS:-} ${CFLAGS:-}")]
cpp_args = [$(quote_list "${CPPFLAGS:-} ${CXXFLAGS:-}")]
c_link_args = [$(quote_list "${LDFLAGS:-}")]
cpp_link_args = [$(quote_list "${LDFLAGS:-}")]
default_library = 'static'
buildtype = 'release'

[host_machine]
system = 'emscripten'
cpu_family = 'wasm32'
cpu = 'wasm32'
endian = 'little'

[properties]
needs_exe_wrapper = true
# Cached results for try_run() probes that meson can't execute under
# cross-compile. The Emscripten libc supports C99-conforming snprintf /
# vsnprintf / printf, so glib (and any other consumer) can rely on them.
have_c99_vsnprintf = true
have_c99_snprintf = true
have_unix98_printf = true
EOF
