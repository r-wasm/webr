webR: Dockerfile scripts/* patches/*
	mkdir -p build
	docker build -t webr-build .
	docker run --rm --mount type=bind,source=$(PWD)/build,target=/app/webR webr-build
	cp repl/index.html build/

clean:
	rm -rf build
