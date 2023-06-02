.PHONY: fonts
fonts: $(WASM)/usr/share/fonts

$(WASM)/usr/share/fonts:
	mkdir -p "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/etc/fonts/"
	wget -O $(FONTS)/NotoSans.zip https://fonts.google.com/download?family=Noto%20Sans
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Regular.ttf > $(FONTS)/NotoSans-Regular.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Bold.ttf > $(FONTS)/NotoSans-Bold.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Italic.ttf > $(FONTS)/NotoSans-Italic.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-BoldItalic.ttf > $(FONTS)/NotoSans-BoldItalic.ttf
	rm $(FONTS)/NotoSans.zip
	wget -O $(FONTS)/NotoSerif.zip https://fonts.google.com/download?family=Noto%20Serif
	unzip -p $(FONTS)/NotoSerif.zip static/NotoSerif/NotoSerif-Regular.ttf > $(FONTS)/NotoSerif-Regular.ttf
	unzip -p $(FONTS)/NotoSerif.zip static/NotoSerif/NotoSerif-Bold.ttf > $(FONTS)/NotoSerif-Bold.ttf
	unzip -p $(FONTS)/NotoSerif.zip static/NotoSerif/NotoSerif-Italic.ttf > $(FONTS)/NotoSerif-Italic.ttf
	unzip -p $(FONTS)/NotoSerif.zip static/NotoSerif/NotoSerif-BoldItalic.ttf > $(FONTS)/NotoSerif-BoldItalic.ttf
	rm $(FONTS)/NotoSerif.zip
	wget -q -O $(FONTS)/NotoSansMono.zip https://fonts.google.com/download?family=Noto%20Sans%20Mono
	unzip -p $(FONTS)/NotoSansMono.zip static/NotoSansMono/NotoSansMono-Regular.ttf > $(FONTS)/NotoSansMono-Regular.ttf
	unzip -p $(FONTS)/NotoSansMono.zip static/NotoSansMono/NotoSansMono-Bold.ttf > $(FONTS)/NotoSansMono-Bold.ttf
	rm $(FONTS)/NotoSansMono.zip
	cp -r "$(FONTS)/." "$(WASM)/usr/share/fonts"
	cp recipes/fonts/fonts.conf "$(WASM)/etc/fonts/local.conf"

.PHONY: clean-fonts
clean-fonts:
	rm -rf "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/etc/fonts/local.conf"
