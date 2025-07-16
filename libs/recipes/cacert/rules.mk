.PHONY: cacert
cacert: $(WASM)/etc/ssl/cert.pem

$(WASM)/etc/ssl/cert.pem:
	mkdir -p "$(WASM)/etc/ssl"
	curl --output "$(WASM)/etc/ssl/cert.pem" https://curl.se/ca/cacert.pem
