# Basic Makefile
PACKAGE = cpufreq
VERSION = 34
UUID = cpufreq@konkor
LOCAL = FALSE
BASEDIR = $(shell pwd)/
BASE_MODULES = metadata.json \
  stylesheet.css \
  extension.js \
  convenience.js \
  prefs.js \
  cpufreqctl \
  cpufreq-service \
  cpufreq-application \
  cpufreq-preferences \
  konkor.cpufreq.policy \
  install.sh \
  BACKERS.md \
  README.md \
  INSTALL.md \
  LICENSE
COMMON_MODULES = Application.js HelperCPUFreq.js Logger.js Preferences.js Settings.js
COMMON_UI_MODULES = ControlPanel.js InfoPanel.js MainWindow.js ProfileItems.js SideMenu.js Slider.js Switch.js
EXTRA_FONTS = fonts/cpufreq.ttf
EXTRA_ICONS = \
data/icons/application-menu-symbolic.svg \
data/icons/cpufreq.png \
data/icons/cpufreq.svg \
data/icons/open-menu-symbolic.svg \
data/icons/feedcat.svg
EXTRA_DATA = \
data/splash.svg \
data/cpufreq-manager.desktop
STYLE_CSS_DEFAULT = data/themes/default/gtk.css

ifneq ($(HOME),/root)
	INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
	RMTMP = echo Not deleting tmp as installation is local
	LOCAL = TRUE
else
	INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
	RMTMP = rm -rf ./_build/tmp
	INSTALLDESK = echo Nothing to do
endif

all: zip-file

clean:
	rm -f ./schemas/gschemas.compiled
	rm -f ./po/*.mo

extension: ./schemas/gschemas.compiled

./schemas/gschemas.compiled: ./schemas/org.gnome.shell.extensions.cpufreq.gschema.xml
	glib-compile-schemas ./schemas/

install: install-local install-desktop


uninstall: uninstall-desktop
	rm -rf $(INSTALLBASE)/$(UUID)
	echo done

install-local: _build
	mkdir -p $(INSTALLBASE)/$(UUID)/tmp
	cp -r $(INSTALLBASE)/$(UUID)/tmp ./_build/.
	$(RMTMP)
	rm -rf $(INSTALLBASE)/$(UUID)
	mkdir -p $(INSTALLBASE)/$(UUID)
	cp -r ./_build/* $(INSTALLBASE)/$(UUID)/
	-rm -fR _build
	echo done

install-desktop:
ifeq ($(LOCAL),TRUE)
	echo 'local desktop installation...'
	sed -i 's+cpufreq-application+$(INSTALLBASE)/$(UUID)/cpufreq-application+g' $(INSTALLBASE)/$(UUID)/data/cpufreq-manager.desktop
	sed -i 's+cpufreq.svg+$(INSTALLBASE)/$(UUID)/data/icons/cpufreq.svg+g' $(INSTALLBASE)/$(UUID)/data/cpufreq-manager.desktop
	cp $(INSTALLBASE)/$(UUID)/data/cpufreq-manager.desktop $(HOME)/.local/share/applications/cpufreq-manager.desktop
else
	echo 'system desktop installation...'
	sed -i 's+cpufreq.svg+cpufreq+g' $(INSTALLBASE)/$(UUID)/data/cpufreq-manager.desktop
	cp $(INSTALLBASE)/$(UUID)/data/cpufreq-manager.desktop /usr/share/applications/cpufreq-manager.desktop
	cp $(INSTALLBASE)/$(UUID)/data/icons/cpufreq.svg /usr/share/icons/hicolor/scalable/apps/cpufreq.svg
	cp $(INSTALLBASE)/$(UUID)/cpufreq-application /usr/bin/cpufreq-application
	gtk-update-icon-cache -q /usr/share/icons/hicolor
endif

uninstall-desktop:
ifeq ($(LOCAL),TRUE)
	rm -f $(HOME)/.local/share/applications/cpufreq-manager.desktop
else
	rm -f /usr/share/applications/cpufreq-manager.desktop
	rm -f /usr/share/icons/hicolor/scalable/apps/cpufreq-application.svg
	rm -f /usr/bin/cpufreq-application
endif

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
	cp $(EXTRA_FONTS) _build/fonts/
	mkdir -p _build/data
	cp $(EXTRA_DATA) _build/data/
	mkdir -p _build/data/icons
	cp $(EXTRA_ICONS) _build/data/icons/
	mkdir -p _build/data/themes/default
	cp $(STYLE_CSS_DEFAULT) _build/data/themes/default
	mkdir -p _build/common/ui
	for f in $(COMMON_MODULES) ; do \
		cp common/$$f _build/common/; \
	done;
	for f in $(COMMON_UI_MODULES) ; do \
		cp common/ui/$$f _build/common/ui/; \
	done;
	mkdir -p _build/schemas
	cp schemas/*.xml _build/schemas/
	cp schemas/gschemas.compiled _build/schemas/
