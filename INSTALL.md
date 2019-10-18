# Install
You can find more on [the project's documentation pages](http://konkor.github.io/cpufreq/install/)

## Dependencies
* Gnome Shell 3.14+;
* supported cpufreq modules.


### From git source
```sh
git clone https://github.com/konkor/cpufreq
cd cpufreq

./autogen.sh && make
sudo make install
```

or just copy (old method)

```sh
mkdir -p ~/.local/share/gnome-shell/extensions/cpufreq@konkor
cp -r * ~/.local/share/gnome-shell/extensions/cpufreq@konkor/
chmod 0755 ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```

## Official Gnome Extension repository [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)
You should select `Install.../Install Updates...` in the extension menu after installation/updating to finish the configuration.

### Install/Update the GNOME extension version from GitHub branch (default `master`)
1. Run [install script](https://github.com/konkor/cpufreq/raw/master/install_extension.sh)
```
./install_extension.sh
```
or for any other branch to example
```
./install_extension.sh BRANCH
```

2. Restart Gnome to reload extensions by:
 * user's **Log-out / Log-in** (_X11/Wayland_)
 * <kbd>Alt</kbd>+<kbd>F2</kbd> and enter <kbd>r</kbd> command (_X11 only_)
 * or just **reboot** PC (_X11/Wayland_)

### From source zip archive (manual method)
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

### From source zip archive (_gnome-tweak-tool_ method)
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

#### Optionally, you can install/update global system components in a terminal
_This step is already handled in the main application UI._ The following command requires super user/Administrator/Root access. Using the same Terminal window, run the following command will allow you to change the governors from the _Cpufreq_ applet.
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

### Updating the existing extension from git source
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

### Complete uninstall and removing of stored settings.
It can be useful if you have saved broken settings values or to clean up previous installation.
You can check this values in the **dconf-editor** at `/org/gnome/shell/extensions/cpufreq/`
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
sudo cpufreqctl uninstall
```
If you want reset the extension's values to defaults just run it and restart gnome-shell.
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
```

### Source and packages
* [GitHub](https://github.com/konkor/cpufreq)
* [Gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

### How-to disable  Intel pstate driver
(default for Intel Sandy Bridge and Ivy Bridge CPUs on kernel 3.9 and upper)
To change back to the ACPI driver, reboot and add to the kernel line `intel_pstate=disable`
Then execute modprobe acpi-cpufreq and you should have the ondemand governor available.

You can make the changes permanent by adding to _/etc/default/grub_
```
GRUB_CMDLINE_LINUX_DEFAULT="intel_pstate=disable"
```
Then update grub.cfg
```
sudo update-grub
```
or
```
sudo grub-mkconfig -o /boot/grub/grub.cfg
```
Follow [the instructions](https://wiki.archlinux.org/index.php/CPU_frequency_scaling) for Arch kernel module loading and add the acpi-cpufreq module.

## Troubleshooting
### Missing symbols
If you have missing symbols you are, probably, missing some fonts, try to install TTF Freefonts, DejaVu and Droid font packages to fix it. Also it's recommended to install Roboto and/or Lato (_sudo apt-get install fonts-roboto fonts-lato_ etc), they are using in the application's UI.
