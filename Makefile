.PHONY: webR
webR:
	mkdir -p dist
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD),target=/app webr-build
	cp loader/repl.html dist/index.html
	cp loader/webR.js dist/webR.js

.PHONY: container-%
container-%:
	docker build -t webr-build .
	docker run -dit --name $* --mount type=bind,source=$(PWD),target=/app webr-build bash

.PHONY: clean
clean:
	cd R && $(MAKE) clean
	cd tools/dragonegg && $(MAKE) clean

.PHONY: distclean
distclean: clean
	rm -rf dist
