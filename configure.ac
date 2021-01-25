dnl Process this file with autoconf to produce a configure script.

AC_INIT(cpufreq, [45])

AC_CONFIG_HEADERS([config.h])

AC_CONFIG_AUX_DIR([.])

AM_INIT_AUTOMAKE([1.11 dist-xz no-dist-gzip foreign tar-ustar])

AM_SILENT_RULES([yes])

LT_INIT

GLIB_GSETTINGS

dnl Packaging version
echo "${VERSION}" > packaging/VERSION

AC_OUTPUT([
Makefile
common/Makefile
common/ui/Makefile
data/Makefile
data/icons/Makefile
data/themes/Makefile
schemas/Makefile
fonts/Makefile
metadata.json
])
chmod 600 metadata.json

echo "

                    ${PACKAGE} ${VERSION}
                    =========
"
