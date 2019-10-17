schemadir=$(datadir)/gnome-shell/extensions/cpufreq@konkor/schemas
schema_DATA= \
    org.gnome.shell.extensions.cpufreq.gschema.xml \
    gschemas.compiled

gsettings_SCHEMAS = org.gnome.shell.extensions.cpufreq.gschema.xml
@GSETTINGS_RULES@

EXTRA_DIST = \
  $(schema_DATA) \
  $(gsettings_SCHEMAS) \
  $(NULL)
