.PHONY: fonts
fonts: $(WASM)/usr/share/fonts $(FC_WASM_LIB)
	rm -rf "$(WASM)/var/cache/fontconfig"
	cp recipes/fonts/fonts.conf "$(WASM)/etc/fonts/fonts.conf"
	node $(BUILD)/fontconfig-$(FC_VERSION)/build/fc-cache/fc-cache \
	  -y "$(WASM)" -r -f -v /usr/share/fonts
	rm -rf "$(WASM)/etc/fonts/conf.d" "$(WASM)/etc/fonts/fonts.conf.bak"

$(WASM)/usr/share/fonts:
	mkdir -p "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/etc/fonts/"
	wget -O $(FONTS)/NotoSans-Regular.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/unhinted/ttf/NotoSans-Regular.ttf
	wget -O $(FONTS)/NotoSans-Bold.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/unhinted/ttf/NotoSans-Bold.ttf
	wget -O $(FONTS)/NotoSans-Italic.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/unhinted/ttf/NotoSans-Italic.ttf
	wget -O $(FONTS)/NotoSans-BoldItalic.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/unhinted/ttf/NotoSans-BoldItalic.ttf

	wget -O $(FONTS)/NotoSerif-Regular.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/unhinted/ttf/NotoSerif-Regular.ttf
	wget -O $(FONTS)/NotoSerif-Bold.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/unhinted/ttf/NotoSerif-Bold.ttf
	wget -O $(FONTS)/NotoSerif-Italic.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/unhinted/ttf/NotoSerif-Italic.ttf
	wget -O $(FONTS)/NotoSerif-BoldItalic.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/unhinted/ttf/NotoSerif-BoldItalic.ttf

	wget -O $(FONTS)/NotoSansMono-Regular.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansMono/unhinted/ttf/NotoSansMono-Regular.ttf
	wget -O $(FONTS)/NotoSansMono-Bold.ttf https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansMono/unhinted/ttf/NotoSansMono-Bold.ttf
	cp -r "$(FONTS)/." "$(WASM)/usr/share/fonts"

.PHONY: clean-fonts
clean-fonts:
	rm -rf "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/var/cache/fontconfig"
