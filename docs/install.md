---
title: Installation
permalink: /install/
description: List of application dependencies, methods of installations and other manipulations.
---

# Table of contents
1. [Dependencies](#dependencies)
1. [Releases page](#releases-page)
1. [Gnome extensions repository](#gnome-extensions)
1. [Git sources](#git-sources)
1. [Packaging](#packaging)
1. [Installation script](#installation-script)
1. [Source Archive](#source-archive)
1. [Gnome Tweak Tool](#gnome-tweak-tool)
1. [Restarting Gnome Shell](#restarting-gnome-shell)
1. [Managing Extensions](#managing-extensions)
1. [Finishing the installation](#finishing-the-installation)
1. [Upgrading the extension](#upgrading-the-extension)
1. [Uninstalling](#uninstalling)
1. [Troubleshooting](#troubleshooting)

# Dependencies
* Gtk 3.14+
* GJS
* fonts-roboto fonts-lato (optionally)

# Releases page
<p class="description">A simple way to install the application from compiled <b>deb</b> packages for Debian/Ubuntu flavors. There are available GNOME Extension <b>cpufreq@konkor.zip</b> packages so.</p>
_Releases page on_ [GitHub](https://github.com/konkor/cpufreq/releases)

You can install downloaded package from GUI package managers like GDEBI or other system utilities or just using CLI.

```sh
sudo dpkg -i cpufreq_VERSION_all.deb
sudo apt-get -f install
```


# Gnome extensions
<p class="description">The official and easiest way to install the extension version on the Gnome Desktop.</p>
_Official repository of the extension on_ [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

You have to select `Install...` or `Install Updates...` in the extension menu after installation/updating to finish the configuration.

_You could try to install the extension through the Gnome Software center so. It's available in many modern distributions._


# Git sources

### Building dependencies
* autogen automake
* gnome-autogen
* devscripts (for DEB packaging only)

```sh
sudo apt-get install autogen automake gnome-common

## for debian packaging
sudo apt-get install devscripts
```

### Building and installing from sources
```sh
git clone https://github.com/konkor/cpufreq
cd cpufreq

./autogen.sh && make
sudo make install
```


# Packaging
### Debian
_Make a DEB package:_
```sh
./autogen.sh && make && make dist
cd packaging/
./packaging.sh
```

### GNOME Extension
_Make a ZIP package for GNOME Shell:_
```sh
./autogen.sh && make && make zip-file
```

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

[Top](#)

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

[Top](#)

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

[Top](#)

# Restarting Gnome Shell
<p class="description">Different ways to restart or re-log current Gnome Shell session</p>
 * user's **Log-out / Log-in** (_X11/Wayland_)
 * <kbd>Alt</kbd>+<kbd>F2</kbd> and enter <kbd>r</kbd> command (_X11 only_)
 * or just **reboot** PC (_X11/Wayland_)

 [Top](#)

# Managing Extensions
<p class="description">Here are some ways to manipulate the extension state (enabling, disabling, installing, updating, removing settings...).</p>

You can manage your extensions in many ways:
* `gnome-shell-extension-prefs`
* `web browser page` [Installed Extensions](https://extensions.gnome.org/local/)
* `gnome-tweak-tool`
* `Gnome Software Center`.
* `Manual method` by removing any extension folder you will remove the extension. After this operation you have to [restart current Gnome session](#restarting-gnome-shell).

[Top](#)

# Finishing the installation
<p class="description">After installing/updating the extension on the system, you have to finalize the procedure in order to allow it to manage the system's power settings</p>

A couple ways to do so:
* **In the extension menu** Select _⚠ Install..._ or _⚠ Install Updates..._ menu item.
* **In the terminal** Run _install_ command
```
sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install
```

[Top](#)

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

[Top](#)

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

[Top](#)

# Troubleshooting
## Missing symbols
If you have missing symbols you are, probably, missing some fonts, try to install TTF Freefonts, DejaVu or/and Droid font packages to fix it.

## Gathering information for reports

Provide more information about your hardware and system like:

 * Intel or AMD CPU
 * intel_pstate or acpi_cpufreq CPU driver
 * Kernel version
 * IRQ Balance enabled or disabled
 * Are you using CPU powering off/on in your profiles
 * Include system journal log's messages or just related parts. See more about logs below.

Report to [issues](https://github.com/konkor/cpufreq/issues) with included system information like distributions, CPU, acpi-cpufreq/intel_pstate mode, system journal errors and description of the issue.

## Debugging

1. First thing to do is check your clean desktop environment to do so you should disable all Gnome shell extensions including this one. Some distributions including pre-installed many extensions and they could conflict with new updates or each other. If all looking fine you can go to the next step.

2. Enable only this extension to test it and easy check system messages.
You can check the system journal messages in a terminal.

3. Run the command `sudo journalctl -f` in a terminal to see `real-time` system messages monitoring and restart Gnome Shell (_X11 only_): <kbd>Alt</kbd>+<kbd>F2</kbd> and enter <kbd>r</kbd> command.

```sh
sudo journalctl -f
```
 * Do not close the monitor in a terminal. Open the extension menu and try to change
 profiles and/or other settings. You could see maybe some warnings, errors or
 when it locks. Copy/paste related messages to text file and include it in your report.

 * Alternatively, you can just _grep_ all messages and check for errors and other warnings.

```sh
# For cpufreq messages
sudo journalctl |grep cpufreq

# For all gnome-session messages
sudo journalctl |grep gnome-session
```


[Top](#)
