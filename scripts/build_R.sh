#!/bin/bash
set -e

build_pcre.sh
build_xz.sh
build_libgfortran.sh

R_VERSION=4.1.2

cd /app/build

rm -rf "R-${R_VERSION}"
rm -f "R-${R_VERSION}.tar.gz"
wget "https://cran.r-project.org/src/base/R-4/R-${R_VERSION}.tar.gz"
tar xvf "R-${R_VERSION}.tar.gz"
cd "R-${R_VERSION}"

# Create R packages using the normal configure/make scheme
patch -p1 < "/app/patches/R-${R_VERSION}/stage1.patch"
FC=gfortran-4.6 CXX=clang++ CC=clang ./configure --prefix=$HOME/webR/R-4.1.2 --with-x=no --with-readline=no --with-jpeglib=no --with-cairo=no --disable-openmp --with-recommended-packages=no --enable-R-profiling=no --with-pcre2 --disable-nls --enable-byte-compiled-packages=no
make R

cp -a "/app/build/R-${R_VERSION}" "/app/build/R-${R_VERSION}_orig"

mkdir -p /app/build/root/usr/lib/R/modules
cp -a etc /app/build/root/usr/lib/R/etc
sed -i 's/x86_64-pc-linux-gnu/wasm32-emscripten/g' /app/build/root/usr/lib/R/etc/Renviron
cp -a library /app/build/root/usr/lib/R/library
pushd /app/build/root/usr/lib/R/library
find -type f -name '*.so' -exec rm -f {} \;
popd

# Build R for web with emscripten
cd "/app/build/R-${R_VERSION}"
patch --ignore-whitespace -p1 < "/app/patches/R-${R_VERSION}/stage2.patch"
sed -i 's/x86_64-pc-linux-gnu/wasm32-emscripten/' src/include/config.h
sed -i 's/x86_64/wasm32/' src/include/config.h
sed -i 's/linux-gnu/emscripten/' src/include/config.h
sed -i '/#define HAVE_LONG_DOUBLE/d' src/include/config.h
sed -i '/#define R_ARCH/d' src/include/config.h

# Force emcc to generate system libc using an empty dummy object
# Extract the containing .o for linking with SIDE_MODULEs later
pushd /tmp
touch dummy.o
emcc -g -std=gnu11 -s MAIN_MODULE=1 -s ASSERTIONS=1 -Oz -o dummy.js dummy.o > /dev/null 2>&1  || true
mkdir -p /app/build/Rlibs/lib/libc/
cp /app/emsdk/upstream/emscripten/cache/sysroot/lib/wasm32-emscripten/libc-debug.a /app/build/Rlibs/lib/libc/
pushd /app/build/Rlibs/lib/libc/
emar x libc-debug.a
popd
popd

pushd src/extra/blas
emfc -c cmplxblas.f -o cmplxblas.o
emfc -c blas.f -o blas.o
emar -cr libRblas.a blas.o cmplxblas.o
popd

pushd src/extra/xdr
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c xdr.c -o xdr.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c xdr_float.c -o xdr_float.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c xdr_mem.c -o xdr_mem.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c xdr_stdio.c -o xdr_stdio.o
emar -cr libxdr.a xdr.o xdr_float.o xdr_mem.o xdr_stdio.o
popd

pushd src/extra/tre
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c regcomp.c -o regcomp.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c regerror.c -o regerror.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c regexec.c -o regexec.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-ast.c -o tre-ast.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-compile.c -o tre-compile.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-match-approx.c -o tre-match-approx.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-match-backtrack.c -o tre-match-backtrack.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-match-parallel.c -o tre-match-parallel.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-mem.c -o tre-mem.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-parse.c -o tre-parse.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c tre-stack.c -o tre-stack.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c xmalloc.c -o xmalloc.o
emar -cr libtre.a regcomp.o regerror.o regexec.o tre-ast.o tre-compile.o tre-match-approx.o tre-match-backtrack.o tre-match-parallel.o tre-mem.o tre-parse.o tre-stack.o xmalloc.o
popd

pushd src/appl
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c integrate.c -o integrate.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c interv.c -o interv.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c maxcol.c -o maxcol.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c optim.c -o optim.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pretty.c -o pretty.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c uncmin.c -o uncmin.o
emfc -c dchdc.f -o dchdc.o
emfc -c dpbfa.f -o dpbfa.o
emfc -c dpbsl.f -o dpbsl.o
emfc -c dpoco.f -o dpoco.o
emfc -c dpodi.f -o dpodi.o
emfc -c dpofa.f -o dpofa.o
emfc -c dposl.f -o dposl.o
emfc -c dqrdc.f -o dqrdc.o
emfc -c dqrdc2.f -o dqrdc2.o
emfc -c dqrls.f -o dqrls.o
emfc -c dqrsl.f -o dqrsl.o
emfc -c dqrutl.f -o dqrutl.o
emfc -c dsvdc.f -o dsvdc.o
emfc -c dtrco.f -o dtrco.o
emfc -c dtrsl.f -o dtrsl.o
emar -cr libappl.a integrate.o interv.o maxcol.o optim.o pretty.o uncmin.o dchdc.o dpbfa.o dpbsl.o dpoco.o dpodi.o dpofa.o dposl.o dqrdc.o dqrdc2.o dqrls.o dqrsl.o dqrutl.o dsvdc.o dtrco.o dtrsl.o
popd

pushd src/nmath
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c mlutils.c -o mlutils.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c d1mach.c -o d1mach.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c i1mach.c -o i1mach.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c fmax2.c -o fmax2.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c fmin2.c -o fmin2.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c fprec.c -o fprec.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c fround.c -o fround.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c ftrunc.c -o ftrunc.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c sign.c -o sign.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c fsign.c -o fsign.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c imax2.c -o imax2.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c imin2.c -o imin2.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c chebyshev.c -o chebyshev.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c log1p.c -o log1p.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c lgammacor.c -o lgammacor.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c gammalims.c -o gammalims.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c stirlerr.c -o stirlerr.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c bd0.c -o bd0.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c gamma.c -o gamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c lgamma.c -o lgamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c gamma_cody.c -o gamma_cody.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c beta.c -o beta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c lbeta.c -o lbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c polygamma.c -o polygamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c cospi.c -o cospi.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c bessel_i.c -o bessel_i.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c bessel_j.c -o bessel_j.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c bessel_k.c -o bessel_k.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c bessel_y.c -o bessel_y.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c choose.c -o choose.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c snorm.c -o snorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c sexp.c -o sexp.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dgamma.c -o dgamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pgamma.c -o pgamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qgamma.c -o qgamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rgamma.c -o rgamma.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dbeta.c -o dbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pbeta.c -o pbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qbeta.c -o qbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rbeta.c -o rbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dunif.c -o dunif.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c punif.c -o punif.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qunif.c -o qunif.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c runif.c -o runif.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnorm.c -o dnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnorm.c -o pnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnorm.c -o qnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rnorm.c -o rnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dlnorm.c -o dlnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c plnorm.c -o plnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qlnorm.c -o qlnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rlnorm.c -o rlnorm.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c df.c -o df.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pf.c -o pf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qf.c -o qf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rf.c -o rf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnf.c -o dnf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dt.c -o dt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pt.c -o pt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qt.c -o qt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rt.c -o rt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnt.c -o dnt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dchisq.c -o dchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pchisq.c -o pchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qchisq.c -o qchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rchisq.c -o rchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rnchisq.c -o rnchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dbinom.c -o dbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pbinom.c -o pbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qbinom.c -o qbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rbinom.c -o rbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rmultinom.c -o rmultinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dcauchy.c -o dcauchy.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pcauchy.c -o pcauchy.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qcauchy.c -o qcauchy.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rcauchy.c -o rcauchy.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dexp.c -o dexp.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pexp.c -o pexp.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qexp.c -o qexp.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rexp.c -o rexp.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dgeom.c -o dgeom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pgeom.c -o pgeom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qgeom.c -o qgeom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rgeom.c -o rgeom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dhyper.c -o dhyper.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c phyper.c -o phyper.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qhyper.c -o qhyper.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rhyper.c -o rhyper.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnbinom.c -o dnbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnbinom.c -o pnbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnbinom.c -o qnbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnbinom_mu.c -o qnbinom_mu.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rnbinom.c -o rnbinom.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dpois.c -o dpois.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c ppois.c -o ppois.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qpois.c -o qpois.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rpois.c -o rpois.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dweibull.c -o dweibull.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pweibull.c -o pweibull.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qweibull.c -o qweibull.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rweibull.c -o rweibull.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dlogis.c -o dlogis.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c plogis.c -o plogis.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qlogis.c -o qlogis.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c rlogis.c -o rlogis.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnchisq.c -o dnchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnchisq.c -o pnchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnchisq.c -o qnchisq.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dnbeta.c -o dnbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnbeta.c -o pnbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnbeta.c -o qnbeta.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnf.c -o pnf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c pnt.c -o pnt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnf.c -o qnf.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qnt.c -o qnt.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c ptukey.c -o ptukey.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c qtukey.c -o qtukey.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c toms708.c -o toms708.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c wilcox.c -o wilcox.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c signrank.c -o signrank.o
emar -cr libnmath.a mlutils.o d1mach.o i1mach.o fmax2.o fmin2.o fprec.o fround.o ftrunc.o sign.o fsign.o imax2.o imin2.o chebyshev.o log1p.o lgammacor.o gammalims.o stirlerr.o bd0.o gamma.o lgamma.o gamma_cody.o beta.o lbeta.o polygamma.o cospi.o bessel_i.o bessel_j.o bessel_k.o bessel_y.o choose.o snorm.o sexp.o dgamma.o pgamma.o qgamma.o rgamma.o dbeta.o pbeta.o qbeta.o rbeta.o dunif.o punif.o qunif.o runif.o dnorm.o pnorm.o qnorm.o rnorm.o dlnorm.o plnorm.o qlnorm.o rlnorm.o df.o pf.o qf.o rf.o dnf.o dt.o pt.o qt.o rt.o dnt.o dchisq.o pchisq.o qchisq.o rchisq.o rnchisq.o dbinom.o pbinom.o qbinom.o rbinom.o rmultinom.o dcauchy.o pcauchy.o qcauchy.o rcauchy.o dexp.o pexp.o qexp.o rexp.o dgeom.o pgeom.o qgeom.o rgeom.o dhyper.o phyper.o qhyper.o rhyper.o dnbinom.o pnbinom.o qnbinom.o qnbinom_mu.o rnbinom.o dpois.o ppois.o qpois.o rpois.o dweibull.o pweibull.o qweibull.o rweibull.o dlogis.o plogis.o qlogis.o rlogis.o dnchisq.o pnchisq.o qnchisq.o dnbeta.o pnbeta.o qnbeta.o pnf.o pnt.o qnf.o qnt.o ptukey.o qtukey.o toms708.o wilcox.o signrank.o
popd

pushd src/unix
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c Rembedded.c -o Rembedded.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c dynload.c -o dynload.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c system.c -o system.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c sys-unix.c -o sys-unix.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c sys-std.c -o sys-std.o
emcc -fPIC -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz  -c X11.c -o X11.o
emar -cr libunix.a Rembedded.o dynload.o system.o sys-unix.o sys-std.o X11.o
emcc -std=gnu11 -I. -I../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz -L/usr/local/lib -DR_HOME='"/"' -o Rscript ./Rscript.c
popd

pushd src/modules/lapack
emfc -c dlamch.f -o dlamch.o
emfc -c dlapack.f -o dlapack.o
emfc -c cmplx.f -o cmplx.o
emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Oz -c Lapack.c -o Lapack.o
emar -cr libRlapack.a dlamch.o dlapack.o cmplx.o Lapack.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o lapack.so dlamch.o dlapack.o cmplx.o Lapack.o ../../extra/blas/libRblas.a /app/build/Rlibs/lib/libgfortran.a /app/build/Rlibs/lib/libc/cabs.o /app/build/Rlibs/lib/libc/csqrt.o
cp lapack.so /app/build/root/usr/lib/R/modules/
popd

if [[ ! -z "${BUILD_INTERNET}" ]]; then
	pushd src/modules/internet
	# Note: xhr.o has been linked into the main module, rather than via internet.so, so that asyncify works
	# emscripten-core/emscripten/issues/15594
	emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Os -c internet.c -o internet.o
	emcc -fPIC -std=gnu11 -I. -I../../../src/include -I/usr/local/include -DHAVE_CONFIG_H -g -Os -c xhr.c -o xhr.o
	emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o internet.so internet.o
	cp internet.so /app/build/root/usr/lib/R/modules/
	popd
fi

pushd src/library/tools/src
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c text.c -o text.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c init.c -o init.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c Rmd5.c -o Rmd5.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c md5.c -o md5.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c signals.c -o signals.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c install.c -o install.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c getfmts.c -o getfmts.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c http.c -o http.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c gramLatex.c -o gramLatex.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c gramRd.c -o gramRd.o
emcc -fPIC -std=gnu11 -I"../../../../include" -I"../../../../src/main" -DNDEBUG -I../../../include -I/usr/local/include -DHAVE_CONFIG_H -fvisibility=hidden  -g -Oz  -c pdscan.c -o pdscan.o
emar -cr tools.a text.o init.o Rmd5.o md5.o signals.o install.o getfmts.o http.o gramLatex.o gramRd.o pdscan.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o tools.so text.o init.o Rmd5.o md5.o signals.o install.o getfmts.o http.o gramLatex.o gramRd.o pdscan.o
cp tools.so /app/build/root/usr/lib/R/library/tools/libs/
popd

pushd src/library/grid/src
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c clippath.c -o clippath.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c gpar.c -o gpar.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c grid.c -o grid.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c just.c -o just.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c layout.c -o layout.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c mask.c -o mask.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c matrix.c -o matrix.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c register.c -o register.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c state.c -o state.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c unit.c -o unit.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c util.c -o util.o
emcc -fPIC -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden -g -Oz  -c viewport.c -o viewport.o
emar -cr grid.a clippath.o gpar.o grid.o just.o layout.o mask.o matrix.o register.o state.o unit.o util.o viewport.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o grid.so clippath.o gpar.o grid.o just.o layout.o mask.o matrix.o register.o state.o unit.o util.o viewport.o
cp grid.so /app/build/root/usr/lib/R/library/grid/libs/
popd

pushd src/library/splines/src
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I/usr/local/include -fvisibility=hidden  -g -Oz  -c splines.c -o splines.o
emar -cr splines.a splines.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o splines.so splines.o
cp splines.so /app/build/root/usr/lib/R/library/splines/libs/
popd

pushd src/library/methods/src
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c do_substitute_direct.c -o do_substitute_direct.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c init.c -o init.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c methods_list_dispatch.c -o methods_list_dispatch.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c slot.c -o slot.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c class_support.c -o class_support.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c tests.c -o tests.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz -fvisibility=hidden  -c utils.c -o utils.o
emar -cr methods.a do_substitute_direct.o init.o methods_list_dispatch.o slot.o class_support.o tests.o utils.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o methods.so do_substitute_direct.o init.o methods_list_dispatch.o slot.o class_support.o tests.o utils.o
cp methods.so /app/build/root/usr/lib/R/library/methods/libs/
popd

pushd src/library/utils/src
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c init.c -o init.o
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c io.c -o io.o
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c size.c -o size.o
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c sock.c -o sock.o
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c stubs.c -o stubs.o
emcc -fPIC -std=gnu11 -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main -I/app/build/Rlibs/include -I/usr/local/include -fvisibility=hidden -g -Oz  -c utils.c -o utils.o
emar -cr utils.a init.o io.o size.o sock.o stubs.o utils.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o utils.so /app/build/Rlibs/lib/liblzma.a init.o io.o size.o sock.o stubs.o utils.o
cp utils.so /app/build/root/usr/lib/R/library/utils/libs/
popd

pushd src/library/grDevices/src
emcc -s USE_BZIP2=1 -s USE_ZLIB=1 -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c axis_scales.c -o axis_scales.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c chull.c -o chull.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c devices.c -o devices.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c init.c -o init.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c stubs.c -o stubs.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c colors.c -o colors.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c clippath.c -o clippath.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c patterns.c -o patterns.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c mask.c -o mask.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c devCairo.c -o devCairo.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c devPicTeX.c -o devPicTeX.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c devPS.c -o devPS.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -g -Oz  -c devQuartz.c -o devQuartz.o
emar -cr grDevices.a axis_scales.o chull.o devices.o init.o stubs.o colors.o clippath.o patterns.o mask.o devCairo.o devPicTeX.o devPS.o devQuartz.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o grDevices.so axis_scales.o chull.o devices.o init.o stubs.o colors.o clippath.o patterns.o mask.o devCairo.o devPicTeX.o devPS.o devQuartz.o
cp grDevices.so /app/build/root/usr/lib/R/library/grDevices/libs/
popd

pushd src/library/graphics/src
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c init.c -o init.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c base.c -o base.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c graphics.c -o graphics.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c par.c -o par.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c plot.c -o plot.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c plot3d.c -o plot3d.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H -I../../../../src/main  -I/usr/local/include -fvisibility=hidden -g -Oz  -c stem.c -o stem.o
emar -cr graphics.a init.o base.o graphics.o par.o plot.o plot3d.o stem.o
emcc -g -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o graphics.so init.o base.o graphics.o par.o plot.o plot3d.o stem.o
cp graphics.so /app/build/root/usr/lib/R/library/graphics/libs/
popd

pushd src/main
emfc -c xxxpr.f -o xxxpr.o
popd

pushd src/library/stats/src
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c init.c -o init.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c kmeans.c -o kmeans.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c ansari.c -o ansari.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c bandwidths.c -o bandwidths.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c chisqsim.c -o chisqsim.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c d2x2xk.c -o d2x2xk.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c fexact.c -o fexact.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c kendall.c -o kendall.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c ks.c -o ks.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c line.c -o line.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c smooth.c -o smooth.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c prho.c -o prho.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c swilk.c -o swilk.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c ksmooth.c -o ksmooth.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c loessc.c -o loessc.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c monoSpl.c -o monoSpl.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c isoreg.c -o isoreg.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c Srunmed.c -o Srunmed.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c dblcen.c -o dblcen.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c distance.c -o distance.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c hclust-utils.c -o hclust-utils.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c nls.c -o nls.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c rWishart.c -o rWishart.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c HoltWinters.c -o HoltWinters.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c PPsum.c -o PPsum.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c arima.c -o arima.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c burg.c -o burg.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c filter.c -o filter.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c mAR.c -o mAR.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c pacf.c -o pacf.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c starma.c -o starma.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c port.c -o port.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c family.c -o family.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c sbart.c -o sbart.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c approx.c -o approx.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c loglin.c -o loglin.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c lowess.c -o lowess.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c massdist.c -o massdist.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c splines.c -o splines.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c lm.c -o lm.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c complete_cases.c -o complete_cases.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c cov.c -o cov.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c deriv.c -o deriv.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c fft.c -o fft.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c fourier.c -o fourier.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c model.c -o model.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c optim.c -o optim.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c optimize.c -o optimize.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c integrate.c -o integrate.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c random.c -o random.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c distn.c -o distn.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c zeroin.c -o zeroin.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c rcont.c -o rcont.o
emcc -fPIC -std=gnu11 -I"../../../../include" -DNDEBUG -I../../../include -DHAVE_CONFIG_H  -I/usr/local/include -fvisibility=hidden -g -Oz  -c influence.c -o influence.o
emfc -c bsplvd.f -o bsplvd.o
emfc -c bvalue.f -o bvalue.o
emfc -c bvalus.f -o bvalus.o
emfc -c loessf.f -o loessf.o
emfc -c ppr.f -o ppr.o
emfc -c qsbart.f -o qsbart.o
emfc -c sgram.f -o sgram.o
emfc -c sinerp.f -o sinerp.o
emfc -c sslvrg.f -o sslvrg.o
emfc -c stxwx.f -o stxwx.o
emfc -c hclust.f -o hclust.o
emfc -c kmns.f -o kmns.o
emfc -c eureka.f -o eureka.o
emfc -c stl.f -o stl.o
emfc -c portsrc.f -o portsrc.o
emfc -c lminfl.f -o lminfl.o
emar -cr stats.a init.o kmeans.o ansari.o bandwidths.o chisqsim.o d2x2xk.o fexact.o kendall.o ks.o line.o smooth.o prho.o swilk.o ksmooth.o loessc.o monoSpl.o isoreg.o Srunmed.o dblcen.o distance.o hclust-utils.o nls.o rWishart.o HoltWinters.o PPsum.o arima.o burg.o filter.o mAR.o pacf.o starma.o port.o family.o sbart.o approx.o loglin.o lowess.o massdist.o splines.o lm.o complete_cases.o cov.o deriv.o fft.o fourier.o model.o optim.o optimize.o integrate.o random.o distn.o zeroin.o rcont.o influence.o bsplvd.o bvalue.o bvalus.o loessf.o ppr.o qsbart.o sgram.o sinerp.o sslvrg.o stxwx.o hclust.o kmns.o eureka.o stl.o portsrc.o lminfl.o
emcc  -g -std=gnu11 -Oz -s WASM_BIGINT -s SIDE_MODULE=1 -o stats.so  init.o kmeans.o ansari.o bandwidths.o chisqsim.o d2x2xk.o fexact.o kendall.o ks.o line.o smooth.o prho.o swilk.o ksmooth.o loessc.o monoSpl.o isoreg.o Srunmed.o dblcen.o distance.o hclust-utils.o nls.o rWishart.o HoltWinters.o PPsum.o arima.o burg.o filter.o mAR.o pacf.o starma.o port.o family.o sbart.o approx.o loglin.o lowess.o massdist.o splines.o lm.o complete_cases.o cov.o deriv.o fft.o fourier.o model.o optim.o optimize.o integrate.o random.o distn.o zeroin.o rcont.o influence.o bsplvd.o bvalue.o bvalus.o loessf.o ppr.o qsbart.o sgram.o sinerp.o sslvrg.o stxwx.o hclust.o kmns.o eureka.o stl.o portsrc.o lminfl.o ../../../main/xxxpr.o ../../../modules/lapack/libRlapack.a ../../../extra/blas/libRblas.a /app/build/Rlibs/lib/libgfortran.a /app/build/Rlibs/lib/libc/cabs.o /app/build/Rlibs/lib/libc/csqrt.o
cp stats.so /app/build/root/usr/lib/R/library/stats/libs/
popd

pushd src/main
emcc -s USE_BZIP2=1 -s USE_ZLIB=1 -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c Rmain.c -o Rmain.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c CommandLineArgs.c -o CommandLineArgs.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c Rdynload.c -o Rdynload.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c Renviron.c -o Renviron.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c RNG.c -o RNG.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c agrep.c -o agrep.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c altclasses.c -o altclasses.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c altrep.c -o altrep.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c apply.c -o apply.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c arithmetic.c -o arithmetic.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c array.c -o array.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c attrib.c -o attrib.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c bind.c -o bind.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c builtin.c -o builtin.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c character.c -o character.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c coerce.c -o coerce.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c colors.c -o colors.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c complex.c -o complex.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -I/app/build/Rlibs/include -DHAVE_CONFIG_H     -g -Oz  -c connections.c -o connections.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c context.c -o context.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c cum.c -o cum.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c dcf.c -o dcf.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c datetime.c -o datetime.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c debug.c -o debug.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c deparse.c -o deparse.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c devices.c -o devices.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c dotcode.c -o dotcode.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c dounzip.c -o dounzip.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c dstruct.c -o dstruct.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c duplicate.c -o duplicate.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c edit.c -o edit.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c engine.c -o engine.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c envir.c -o envir.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c errors.c -o errors.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c eval.c -o eval.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c format.c -o format.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c gevents.c -o gevents.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c gram.c -o gram.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c gram-ex.c -o gram-ex.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c graphics.c -o graphics.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -I/app/build/Rlibs/include -DHAVE_CONFIG_H     -g -Oz  -c grep.c -o grep.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c identical.c -o identical.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c inlined.c -o inlined.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c inspect.c -o inspect.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c internet.c -o internet.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c iosupport.c -o iosupport.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c lapack.c -o lapack.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c list.c -o list.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c localecharset.c -o localecharset.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c logic.c -o logic.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c main.c -o main.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c mapply.c -o mapply.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c match.c -o match.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c memory.c -o memory.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c names.c -o names.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c objects.c -o objects.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c options.c -o options.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c paste.c -o paste.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c patterns.c -o patterns.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -I/app/build/Rlibs/include -DHAVE_CONFIG_H     -g -Oz  -c platform.c -o platform.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c plot.c -o plot.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c plot3d.c -o plot3d.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c plotmath.c -o plotmath.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c print.c -o print.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c printarray.c -o printarray.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c printvector.c -o printvector.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c printutils.c -o printutils.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c qsort.c -o qsort.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c radixsort.c -o radixsort.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c random.c -o random.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c raw.c -o raw.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c registration.c -o registration.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c relop.c -o relop.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c rlocale.c -o rlocale.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/extra/xdr -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c saveload.c -o saveload.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c scan.c -o scan.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c seq.c -o seq.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/extra/xdr -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c serialize.c -o serialize.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c sort.c -o sort.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c source.c -o source.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c split.c -o split.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c sprintf.c -o sprintf.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c startup.c -o startup.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c subassign.c -o subassign.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c subscript.c -o subscript.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c subset.c -o subset.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c summary.c -o summary.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c sysutils.c -o sysutils.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c times.c -o times.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c unique.c -o unique.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -I/app/build/Rlibs/include -DHAVE_CONFIG_H  -DHAVE_CONFIG_H     -g -Oz  -c util.c -o util.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H -DR_ARCH='""' -g -Oz  -c version.c -o version.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c g_alab_her.c -o g_alab_her.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c g_cntrlify.c -o g_cntrlify.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c g_fontdb.c -o g_fontdb.o
emcc -fPIC -std=gnu11 -I../../src/extra  -I. -I../../src/include  -I/usr/local/include -I../../src/nmath -DHAVE_CONFIG_H     -g -Oz  -c g_her_glyph.c -o g_her_glyph.o
popd

EXTRA_FLAGS="${EXTRA_FLAGS:=}"
if [[ ! -z "${BUILD_INTERNET}" ]]; then
	EXTRA_FLAGS+="../../modules/internet/xhr.o "
	BUILD_ASYNC=1
fi
if [[ ! -z "${BUILD_ASYNC}" ]]; then
	EXTRA_FLAGS+="-s ASYNCIFY -s ASYNCIFY_STACK_SIZE=1000000"
fi

mkdir -p src/main/bin
pushd src/main/bin
emcc -g -Oz -std=gnu11 -L/usr/local/lib -o R.bin.js ../Rmain.o ../CommandLineArgs.o ../Rdynload.o ../Renviron.o \
../RNG.o ../agrep.o ../altclasses.o ../altrep.o ../apply.o ../arithmetic.o ../array.o ../attrib.o ../bind.o \
../builtin.o ../character.o ../coerce.o ../colors.o ../complex.o ../connections.o ../context.o ../cum.o ../dcf.o \
../datetime.o ../debug.o ../deparse.o ../devices.o ../dotcode.o ../dounzip.o ../dstruct.o ../duplicate.o ../edit.o \
../engine.o ../envir.o ../errors.o ../eval.o ../format.o ../gevents.o ../gram.o ../gram-ex.o ../graphics.o ../grep.o \
../identical.o ../inlined.o ../inspect.o ../internet.o ../iosupport.o ../lapack.o ../list.o ../localecharset.o \
../logic.o ../main.o ../mapply.o ../match.o ../memory.o ../names.o ../objects.o ../options.o ../paste.o ../patterns.o \
../platform.o ../plot.o ../plot3d.o ../plotmath.o ../print.o ../printarray.o ../printvector.o ../printutils.o \
../qsort.o ../radixsort.o ../random.o ../raw.o ../registration.o ../relop.o ../rlocale.o ../saveload.o ../scan.o \
../seq.o ../serialize.o ../sort.o ../source.o ../split.o ../sprintf.o ../startup.o ../subassign.o ../subscript.o \
../subset.o ../summary.o ../sysutils.o ../times.o ../unique.o ../util.o ../version.o ../g_alab_her.o ../g_cntrlify.o \
../g_fontdb.o ../g_her_glyph.o ../xxxpr.o ${EXTRA_FLAGS} `ls ../../unix/*.o ../../appl/*.o ../../nmath/*.o` \
../../extra/tre/libtre.a ../../extra/blas/libRblas.a ../../extra/xdr/libxdr.a /app/build/Rlibs/lib/libpcre2_8.a \
/app/build/Rlibs/lib/liblzma.a /app/build/Rlibs/lib/libgfortran.a -lrt -ldl -lm --use-preload-plugins \
--preload-file /app/build/root@/ -s USE_BZIP2=1 -s USE_ZLIB=1 -s USE_LIBPNG=1 -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
-s WASM_BIGINT -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MAIN_MODULE=1 -s ASSERTIONS=1 -s FETCH=1 -s NO_EXIT_RUNTIME=0
cp * /app/webR/
