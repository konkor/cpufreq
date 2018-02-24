---
title: Git
description: Manual installation from GitHub repository through Git.
---

## From git source

```
git clone https://github.com/konkor/cpufreq
cd cpufreq

mkdir -p ~/.local/share/gnome-shell/extensions/cpufreq@konkor
cp -r * ~/.local/share/gnome-shell/extensions/cpufreq@konkor/
chmod 0755 ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```

The following command requires super user/Administrator/Root access. Using the same Terminal window, run the following command will allow you to change the governors from the _Cpufreq_ applet.
1. `sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install`
1. You will be prompt to enter your password
1. _Cpufreq_ applet is now installed and its menu is now displayed in GNOME top toolbar
1. Done. You have successfully installed _Cpufreq_.

Optionally, if you need to install _Cpufreq_ for an additional GNOME user(s), but that user(s) do not have super user/Administrator/Root access, here are the steps that will allow that user to change the governors from the _Cpufreq_ applet
1. Login that additional GNOME user(s)
1. Run all the same command lines as [that section above](https://github.com/konkor/cpufreq/blob/master/README.md#from-git-source)
1. Open GNOME _Tweak Tools_ (gnome-tweak-tool). Click on _Extensions_ vertical tab.
1. Click on the toggle button next to _Cpufreq_ row to turn it ON
1. Restart GNOME by pressing "Alt+F2' keys. When prompt type in "r" without the quotes. Press "Enter" key. Wait a few seconds for GNOME to refresh.
1. _Cpufreq_ applet is now installed and its menu is now displayed in GNOME top toolbar
1. Done. You have successfully installed _Cpufreq_.
