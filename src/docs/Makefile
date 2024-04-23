TS_SOURCES = $(shell find .. -name '*.ts' -not -path '../node_modules/*')
QMD_SOURCES = $(shell find . -name '*.qmd') _quarto.yml

-include ~/.webr-config.mk
WEBR_VERSION ?= $(shell node -p "require('../package.json').version")
WEBR_VERSION_TAG ?= latest

_site: api/js $(QMD_SOURCES)
	WEBR_VERSION=$(WEBR_VERSION) WEBR_VERSION_TAG=$(WEBR_VERSION_TAG) \
	  quarto render

api/js: $(TS_SOURCES)
	cd .. && make node_modules
	npx typedoc --plugin typedoc-plugin-markdown --tsconfig ../tsconfig.json

clean:
	rm -rf api/js _site
