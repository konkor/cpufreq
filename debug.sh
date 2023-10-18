#!/bin/sh -e
reset
export G_MESSAGES_DEBUG=debug
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768

dbus-run-session -- \
    gnome-shell --nested \
                --wayland