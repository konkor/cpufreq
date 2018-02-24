---
title: Gnome Tweak Tool
description: installation of the source archive from GitHub through Gnome Tweak Tool.
---

## From source zip archive (_gnome-tweak-tool_ method)
Download zip archive from GitHub page. Run _gnome-tweak-tool_ go to extensions tab,
click _Install Shell Extension_ from a drive and select _cpufreq-master.zip_.
Detailed steps below:
```
wget https://github.com/konkor/cpufreq/archive/master.zip
gnome-tweak-tool # Select 'Install Shell Extension' button on the Extensions Tab.
chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
Now close _gnome-tweak-tool_ and restart _gnome-shell_ Log Out or just enter 'r' command in 'Alt-F2' prompt.
```
gnome-tweak-tool # Turn on the extension.
cpufreq extension => ⚠ Install...
```
