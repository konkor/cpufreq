---
title: Installation
permalink: /install/
description: List of extension dependencies, methods of installations and other manipulations.
---

# Table of contents
1. [Dependencies](#dependencies)
2. [Gnome extensions repository](#gnome-extensions)
3. [Installation script](#installation-script)
4. [Source Archive](#source-archive)
5. [Gnome Tweak Tool](#gnome-tweak-tool)
6. [Git Clone](#git-clone)
1. [Restarting Gnome Shell](#restarting-gnome-shell)
1. [Managing Extensions](#managing-extensions)
1. [Finishing the installation](#finishing-the-installation)
1. [Upgrading the extension](#upgrading-the-extension)
1. [Uninstalling](#uninstalling)
1. [Troubleshooting](#troubleshooting)

# Dependencies
* Gnome Shell 3.14+
* supported cpufreq modules...

# Gnome extensions
<p class="description">The official and easiest way to install the extension on the Gnome Desktop.</p>
_Official repository of the extension on_ [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

You have to select `Install...` or `Install Updates...` in the extension menu after installation/updating to finish the configuration.

_You could try to install the extension through the Gnome Software center so. It's available in many modern distributions._

# Installation script
<p class="description">Installing the extension through the installation script from the GitHub repository.</p>
1. Run [install script](https://github.com/konkor/cpufreq/raw/master/install.sh) _(default `master` branch)_
``` sh
chmod a+x install.sh
./install.sh
```
or for `gtk` branch to example
``` bash
./install.sh gtk
```
2. [Restart Gnome Shell](#restarting-gnome-shell) to reload extensions.

# Source Archive

<p class="description">Manual installation from the GitHub branch's  source archive.</p>

1. Download zip archive from GitHub page _[cpufreq-master.zip](https://github.com/konkor/cpufreq/archive/master.zip)_.
2. Extract _cpufreq-master.zip_ archive and copy all to the _~/.local/share/gnome-shell/extensions/cpufreq@konkor_ folder.
3. Optionally, check/fix the executing bit:
```
chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
4. [Restart Gnome Shell](#restarting-gnome-shell) to reload extensions.
5. Enable the cpufreq extension. _See_ [Managing Extensions](#managing-extensions).

_PS: I recommend you to install it through the [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/) repository and just update files from the GitHub [archive](https://github.com/konkor/cpufreq/archive/master.zip). This makes you avoid a few steps of the manual method._

# Gnome Tweak Tool
<p class="description">installation of the source archive from GitHub through Gnome Tweak Tool.</p>

Download zip archive from GitHub page. Run _gnome-tweak-tool_ go to extensions tab,
click _Install Shell Extension_ from a drive and select _cpufreq-master.zip_.
Detailed steps below:
```
wget https://github.com/konkor/cpufreq/archive/master.zip
gnome-tweak-tool # Select 'Install Shell Extension' button on the Extensions Tab.
chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
* Now close _gnome-tweak-tool_ and [restart gnome-shell](#restarting-gnome-shell) to reload extensions.
* Enable extension (_See_ [Managing Extensions](#managing-extensions) _so_)
```
gnome-tweak-tool # Turn on the extension.
```
* Finish the installation inside the extension menu to enable the extension policy and CLI.
```
cpufreq extension => ⚠ Install...
```

# Restarting Gnome Shell
<p class="description">Different ways to restart or re-log current Gnome Shell session</p>
 * user's **Log-out / Log-in** (_X11/Wayland_)
 * <kbd>Alt</kbd>+<kbd>F2</kbd> and enter <kbd>r</kbd> command (_X11 only_)
 * or just **reboot** PC (_X11/Wayland_)

# Managing Extensions
<p class="description">Here are some ways to manipulate the extension state (enabling, disabling, installing, updating, removing settings...).</p>

You can manage your extensions in many ways:
* `gnome-shell-extension-prefs`
* `web browser page` [Installed Extensions](https://extensions.gnome.org/local/)
* `gnome-tweak-tool`
* `Gnome Software Center`.
* `Manual method` by removing any extension folder you will remove the extension. After this operation you have to [restart current Gnome session](#restarting-gnome-shell).

# Finishing the installation
<p class="description">After installing/updating the extension on the system, you have to finalize the procedure in order to allow it to manage the system's power settings</p>

A couple ways to do so:
* **In the extension menu** Select _⚠ Install..._ or _⚠ Install Updates..._ menu item.
* **In the terminal** Run _install_ command
```
sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install
```

# Upgrading the extension
<p class="description">Here are some ways to upgrade the extension</p>

Hopefuly frequently, the extension will receives updates to fix bugs, update the documentation or add new features and abilities.
So here is a few ways to do this:
1. You can update the extension through the `web browser page` [Installed Extensions](https://extensions.gnome.org/local/)
2. You can do this in the `Gnome Software Center`.
3. You can get the development version from GitHub.
 * Download desired archive from GitHub
```
wget https://github.com/konkor/cpufreq/archive/master.zip
```
 * Extract _cpufreq-master.zip_.
 * Replace all files in the _~/.local/share/gnome-shell/extensions/cpufreq@konkor_ folder.
 * [Restart GNOME Shell](#restarting-gnome-shell).
4. You can use [installation script](#installation-script) to do it. Using the command will switch you to the latest desired GitHub branch:
```
./install.sh [GITHUB_BRANCH]
```
**After Upgrading you may have to finish the [installation](#finishing-the-installation) as the extension could also update its API.**

# Uninstalling
<p class="description">Sometimes we need to remove some extension. The cause could be for example complete reinstallation or bugs. It can be useful if you have saved broken settings values or to clean up previous installations.</p>

Completly removing the extension and stored settings.
1. Remove the extension folder
```
rm -Rf ~/.local/share/gnome-shell/extensions/cpufreq@konkor
```
**Be careful with this command as any mistake could cause a data loss!!!**

2. You can check this values in the **dconf-editor** at `/org/gnome/shell/extensions/cpufreq/`
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
sudo rm /usr/share/polkit-1/actions/konkor.cpufreq.policy
sudo rm /usr/bin/cpufreqctl
```
If you want reset the extension's values to defaults just run it and restart gnome-shell.
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
```

# Troubleshooting
## Missing symbols
If you have missing symbols you are, probably, missing some fonts, try to install TTF Freefonts, DejaVu or/and Droid font packages to fix it.
