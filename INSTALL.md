# Install
You can find more on [the project's documentation pages](http://konkor.github.io/cpufreq/install/)

## Dependencies

* Gtk 3.14+
* GJS
* supported hardware.
* fonts-roboto fonts-lato (optionally)

## [Releases page](https://github.com/konkor/cpufreq/releases)
There are the latest releases and installation packages for Debian/Ubuntu flavors and GNOME Extension zip file. You can install downloaded package from GUI package managers like GDEBI or other system utilities or just using CLI.

```sh
sudo dpkg -i cpufreq_VERSION_all.deb
sudo apt-get -f install
```

## GNOME Extension repository [extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)
You should select `Install.../Install Updates...` in the extension menu after installation/updating to finish the configuration.


## From sources

### Building dependencies
* autogen automake
* gnome-autogen
* devscripts (for DEB packaging only)

```sh
sudo apt-get install autogen automake gnome-common

## for debian packaging
sudo apt-get install devscripts
```

### From git source
```sh
git clone https://github.com/konkor/cpufreq
cd cpufreq

./autogen.sh && make
sudo make install
```


## Packaging
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


## Complete uninstall and removing of stored settings.
It can be useful if you have saved broken settings values or to clean up previous installation.
You can check this values in the **dconf-editor** at `/org/gnome/shell/extensions/cpufreq/`
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
sudo cpufreqctl --uninstall
```
If you want reset the extension's values to defaults just run it and restart gnome-shell.
```
dconf reset -f "/org/gnome/shell/extensions/cpufreq/"
```


## Troubleshooting
### Missing symbols
If you have missing symbols you are, probably, missing some fonts, try to install TTF Freefonts, DejaVu and Droid font packages to fix it. Also it's recommended to install Roboto and/or Lato (_sudo apt-get install fonts-roboto fonts-lato_ etc), they are using in the application's UI.

### Source and packages
* [GitHub](https://github.com/konkor/cpufreq)
* [Gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)
