## Process this file with automake to produce Makefile.in

APP_ID = cpufreq@konkor

packagedir = gnome-shell/extensions

DIST_SUBDIRS = data schemas common fonts

SUBDIRS = data schemas common fonts

jsdir = $(datadir)/$(packagedir)/$(APP_ID)
js_DATA = \
    README.md \
    INSTALL.md \
    BACKERS.md \
    convenience.js \
    extension.js \
    prefs.js \
    metadata.json \
    stylesheet.css \
    konkor.cpufreq.policy \
    LICENSE

js_SCRIPTS = cpufreq-application \
    cpufreq-preferences \
    cpufreq-service \
    cpufreqctl

bin_SCRIPTS = cpufreq-application \
    cpufreq-preferences \
    cpufreq-service

dist_js_DATA = $(js_SCRIPTS)

dist_doc_DATA = \
    README.md \
    INSTALL.md \
    BACKERS.md

policydir=/usr/share/polkit-1/actions
policy_DATA = konkor.cpufreq.policy

helperdir=/usr/bin
helper_SCRIPTS = cpufreqctl

EXTRA_DIST = $(js_DATA) metadata.json.in

uninstall-local:
	-rm -r $(jsdir)

zip-file: all
	-rm -fR $(builddir)/_build
	-rm -fR $(builddir)/zip-files
	$(MKDIR_P) $(builddir)/_build; \
	$(MKDIR_P) $(builddir)/zip-files; \
	$(MAKE) install DESTDIR="$(abs_builddir)/_build"; \
	mv "$(builddir)/_build/$(jsdir)" "$(builddir)/_build/"; \
	cp -r "$(builddir)/_build$(datadir)/locale" "$(builddir)/_build/$(APP_ID)"; \
	(cd "$(builddir)/_build/$(APP_ID)"; \
	 zip -qr "../../zip-files/$(APP_ID).zip" .; \
	);
	-rm -fR $(builddir)/_build
