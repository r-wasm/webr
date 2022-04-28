# Build webR and install the web app in `./dist`
.PHONY: webr
webr:
	cd R && $(MAKE) && $(MAKE) install
	cd loader && $(MAKE)

# Build webR in a temporary docker container
.PHONY: docker-webr
docker-webr:
	mkdir -p dist
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD),target=/app webr-build

# Create a permanent docker container for building webR. Call `make`
# from within the container to start the build.
.PHONY: docker-container-%
docker-container-%:
	docker build -t webr-build .
	docker run -dit --name $* --mount type=bind,source=$(PWD),target=/app webr-build bash

.PHONY: clean
clean:
	rm -rf host wasm
	cd R && $(MAKE) clean
	cd tools/dragonegg && $(MAKE) clean

.PHONY: distclean
distclean: clean
	rm -rf dist
