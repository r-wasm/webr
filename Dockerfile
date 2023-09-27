ARG BASE=ghcr.io/r-wasm/webr-flang:main
FROM $BASE

# Install node 18
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
        https://deb.nodesource.com/node_18.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install nodejs -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Setup environment for Emscripten
ENV PATH="/opt/emsdk:/opt/emsdk/upstream/emscripten:${PATH}"
ENV EMSDK="/opt/emsdk"
ENV EM_NODE_JS="/usr/bin/node"

# Download webR and configure for LLVM flang
RUN git clone --depth=1 https://github.com/r-wasm/webr.git /opt/webr
WORKDIR /opt/webr
RUN ./configure && \
    ln -s /opt/flang/wasm ./wasm && \
    ln -s /opt/flang/host ./host && \
    ln -s /opt/flang/emfc ./host/bin/emfc

# Build webR with supporting Wasm libs
RUN cd libs && make all
RUN make

# Setup PPM for binary native R packages
COPY <<EOF /root/.Rprofile
options(repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/jammy/latest"))
options(HTTPUserAgent = sprintf(
    "R/%s R (%s)",
    getRversion(),
    paste(
        getRversion(),
        R.version["platform"],
        R.version["arch"],
        R.version["os"]
    )
))
EOF

# Cleanup
RUN rm -rf libs/download libs/build src/node_modules R/download
RUN cd src && make clean

# Squash docker image layers
FROM $BASE
COPY --from=0 / /
SHELL ["/bin/bash", "-c"]
