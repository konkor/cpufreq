---
title: Source Archive
description: Manual installation of the source archive from GitHub branch.
---

## From source zip archive _(manual method)_
1. Download zip archive from GitHub page _[cpufreq-master.zip](https://github.com/konkor/cpufreq/archive/master.zip)_.
2. Extract _cpufreq-master.zip_ archive and copy all to the _~/.local/share/gnome-shell/extensions/cpufreq@konkor_ folder.
3. Optionally, check/fix the executing bit:
 * _chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl_
4. Restart Gnome to reload extensions by:
 * user's **Log-out/Log-in** (_X11/Wayland_)
 * <kbd>Alt</kbd>+<kbd>F2</kbd> and enter <kbd>r</kbd> command (_X11 only_)
 * or just **reboot** PC (_X11/Wayland_)
5. Enable the cpufreq extension by:
 * `gnome-shell-extension-prefs`
 * web browser page [Installed Extensions](https://extensions.gnome.org/local/)
 * `gnome-tweak-tool`

_PS: I'd recommend you the installing through the [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/) repository and just update files from the GitHub [archive](https://github.com/konkor/cpufreq/archive/master.zip). That's how you could avoid a few steps of the manual method._
