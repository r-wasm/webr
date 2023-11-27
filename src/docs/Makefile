TS_SOURCES = $(shell find .. -name '*.ts' -not -path '../node_modules/*')

_site: api/js
	quarto render

api/js: $(TS_SOURCES)
	cd .. && make node_modules
	npx typedoc --plugin typedoc-plugin-markdown --tsconfig ../tsconfig.json

clean:
	rm -rf api/js _site
