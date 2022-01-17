# Based on https://chrz.de/2020/04/21/fortran-in-the-browser/

FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive TZ=Europe/London

# We need some older toolchain binaries from trusty
RUN echo "deb http://archive.ubuntu.com/ubuntu/ trusty main restricted universe" >> /etc/apt/sources.list && \
    echo "deb http://security.ubuntu.com/ubuntu/ trusty-security main" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get -y install --no-install-recommends \
        build-essential curl wget git gnutls-bin bash make cmake ca-certificates xz-utils \
        gfortran-4.6 g++-4.6 gcc-4.6 gcc-4.6-plugin-dev gfortran-4.6 llvm-3.3-dev python3 \
		libbz2-dev liblzma-dev libpcre2-dev libcurl4-openssl-dev libpng-dev clang-3.3 zlib1g-dev && \
    rm -rf /var/lib/apt/lists/*
 
WORKDIR /app

# dragonegg
RUN git clone --single-branch --branch="release_33" --depth=1 https://github.com/llvm-mirror/dragonegg.git && \
    cd dragonegg && \
    LLVM_CONFIG=llvm-config-3.3 GCC=gcc-4.6 CC=gcc-4.6 CXX=g++-4.6 make -j$(nproc) && \
    mkdir -p /app/bin && \
    mv dragonegg.so /app/bin/
 
# emscripten
RUN git clone --depth=1 https://github.com/emscripten-core/emsdk.git && \
    cd emsdk && \
    ./emsdk install "3.1.1" && \
    ./emsdk activate "3.1.1"

RUN mkdir -p /app/build
ENV PATH="/app/bin:/app/scripts:/app/emsdk:/app/emsdk/node/12.9.1_64bit/bin:/app/emsdk/upstream/emscripten:${PATH}"
ENV LIBRARY_PATH="/app/lib:${LIBRARY_PATH}"
 
COPY scripts /app/scripts
COPY patches /app/patches
COPY emterm /app/emterm
