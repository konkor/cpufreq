---
title: Complete Uninstalling
description: Manual uninstalling of the extension from the system.
---

## Complete uninstall and removing of stored settings.
It can be useful if you have saved broken settings values or to clean up previous installation.
You can check this values in the **dconf-editor** at `/org/gnome/shell/extensions/cpufreq/`
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
sudo rm /usr/share/polkit-1/actions/konkor.cpufreq.policy
sudo rm /usr/bin/cpufreqctl
```
If you want reset the extension's values to defaults just run it and restart gnome-shell.
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
```
