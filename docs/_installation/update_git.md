---
title: Manual Updating
description: Manual updating from GitHub source archive.
---

## Updating the existing extension from git source
1. wget https://github.com/konkor/cpufreq/archive/master.zip
1. Extract _cpufreq-master.zip_.
1. Copy/Replace all files in the _~/.local/share/gnome-shell/extensions/cpufreq@konkor_ folder.
1. Restart GNOME by pressing "Alt+F2' keys. When prompt type in "r" without the quotes. Press "Enter" key.

### You should fix executing bit after installation through the `gnome-tweak-tool` or `git clone` to able to run the extension.
```
chmod +x  ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
If you want change governors or/and frequencies You have to install it.
```
sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install
```
