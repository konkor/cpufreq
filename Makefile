# Basic Makefile

UUID = cpufreq@konkor
BASE_MODULES = metadata.json \
              stylesheet.css \
              extension.js \
              convenience.js \
              prefs.js \
              cpufreqctl \
              cpufreq-service \
              konkor.cpufreq.policy \
              install.sh \
              BACKERS.md \
              README.md \
              INSTALL.md \
              LICENSE
EXTRA_MEDIA = fonts/cpufreq.ttf

ifeq ($(strip $(DESTDIR)),)
	INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
	RMTMP = echo Not deleting tmp as installation is local
else
	INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
	RMTMP = rm -rf ./_build/tmp
endif

all: zip-file

clean:
	rm -f ./schemas/gschemas.compiled
	rm -f ./po/*.mo

extension: ./schemas/gschemas.compiled

./schemas/gschemas.compiled: ./schemas/org.gnome.shell.extensions.cpufreq.gschema.xml
	glib-compile-schemas ./schemas/

install: install-local

install-local: _build
	mkdir -p $(INSTALLBASE)/$(UUID)/tmp
	cp -r $(INSTALLBASE)/$(UUID)/tmp ./_build/.
	$(RMTMP)
	rm -rf $(INSTALLBASE)/$(UUID)
	mkdir -p $(INSTALLBASE)/$(UUID)
	cp -r ./_build/* $(INSTALLBASE)/$(UUID)/
	-rm -fR _build
	echo done

zip-file: _build
	cd _build ; \
	zip -qr "$(UUID)$(VSTRING).zip" .
	mv _build/$(UUID)$(VSTRING).zip ./
	-rm -fR _build

_build: extension
	-rm -fR ./_build
	mkdir -p _build
	cp $(BASE_MODULES) _build
	mkdir -p _build/fonts
	cp $(EXTRA_MEDIA) _build/fonts/
	mkdir -p _build/schemas
	cp schemas/*.xml _build/schemas/
	cp schemas/gschemas.compiled _build/schemas/
