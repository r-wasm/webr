ARG BASE=ghcr.io/r-wasm/webr-flang:main
FROM $BASE as webr

# Setup environment for Emscripten
ENV PATH="/opt/emsdk:/opt/emsdk/upstream/emscripten:${PATH}"
ENV EMSDK="/opt/emsdk"
ENV WEBR_ROOT="/opt/webr"
ENV EM_NODE_JS="/usr/bin/node"

FROM webr as scratch
# Install node 18
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
        https://deb.nodesource.com/node_18.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install nodejs -y

RUN curl -L https://rig.r-pkg.org/deb/rig.gpg -o /etc/apt/trusted.gpg.d/rig.gpg &&\
    sh -c 'echo "deb http://rig.r-pkg.org/deb rig main" > /etc/apt/sources.list.d/rig.list' &&\
    apt update && apt install r-rig

RUN rig add 4.3.0

# Download webR and configure for LLVM flang
RUN git clone --depth=1 https://github.com/r-wasm/webr.git /opt/webr
WORKDIR /opt/webr
RUN ./configure && \
    ln -s /opt/flang/wasm ./wasm && \
    ln -s /opt/flang/host ./host && \
    ln -s /opt/flang/emfc ./host/bin/emfc

# Install r-wasm's webr package for native R
RUN R CMD INSTALL packages/webr

# Build webR with supporting Wasm libs
RUN cd libs && make all
RUN make

# Cleanup
RUN rm -rf libs/download libs/build src/node_modules R/download
RUN cd src && make clean

# Squash docker image layers
FROM webr
COPY --from=scratch / /
WORKDIR /root
SHELL ["/bin/bash", "-c"]
