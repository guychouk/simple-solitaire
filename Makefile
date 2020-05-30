.PHONY: gen-spritesheet
gen-spritesheet:
	montage assets/PNG-cards-1.3/*.png -tile 4x13 -geometry 500x726+0+0 -background transparent public/cards-spritesheet.png
