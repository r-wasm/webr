webR: Dockerfile scripts/* patches/* loader/*
	mkdir -p dist
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD)/dist,target=/app/webR webr-build
	cp loader/repl.html dist/index.html
	cp loader/webR.js dist/webR.js

clean:
	rm -rf dist
