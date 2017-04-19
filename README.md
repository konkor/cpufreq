# cpufreq
Gnome Shell 3.14+ CPU Frequency Monitor and Governor Manager.

https://extensions.gnome.org/extension/1082/cpufreq/

![](/data/screenshots.png?raw=true)

This is lightweight gnome-extension for CPU scaling monitor and power governor's management. The extension is using standard cpufrequtils (cpupower) package to collect information and manage governors. It's need root permission to able changing governors or install policy for pkexec.

[Phoronix Benchmarks](http://www.phoronix.com/scan.php?page=article&item=linux-47-schedutil&num=1)

Please install cpufrequtils or cpupower:

* Debian/Ubuntu
```
sudo apt-get install cpufrequtils
```

* Arch Linux
```
sudo pacman -S cpupower
```
* Fedora
```
yum install kernel-tools
```

## Features
* Compatible with old cpufreq tools and modern cpupower;
* Boost supporting;
* Utilize userspace and pstate abilities.

## Install
### Dependencies
* Gnome Shell >= 3.14+
* cpufrequtils or cpupower

### You need fix executing bit after installation to able to change governors
[extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

```
cd ~/.local/share/gnome-shell/extensions/cpufreq@konkor
chmod 0755 cpufreqctl
```
If you want change governors without asking root password each time You need edit user home folder in konkor.cpufreq.policy and install it. Change 'USERNAME' to user's real name.
```
sudo cp konkor.cpufreq.policy /usr/share/polkit-1/actions/
```

### From source zip archive
Download zip archive from github page. Run _gnome-tweak-tool_ go to extensions tab,
click _Install Shell Extension_ from drive and select _master.zip_.
Restart Gnome shell by pressing Alt-F2 and entering 'r'.
```
$wget https://github.com/konkor/cpufreq/archive/master.zip
$gnome-tweak-tool # Select 'Install Shell Extension' button on the Extensions Tab.
$chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
Now close gnome-tweak-tool and restart gnome-shell Log out or just enter 'r' command in 'Alt-F2' promt.
```
$gnome-tweak-tool # Turn on the extension.
cpufreq extension => ⚠ Install...
```

### From git source
```
git clone https://github.com/konkor/cpufreq
cd cpufreq
unzip cpufreq-master.zip

mkdir -p ~/.local/share/gnome-shell/extensions/cpufreq@konkor
cd cpufreq-master/
cp -r * ~/.local/share/gnome-shell/extensions/cpufreq@konkor/
chmod 0755 ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl

sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install
```
Last rows are to able change governors without asking super user password when you changing governors from the applet.

### Source and packages
* [GitHub](https://github.com/konkor/cpufreq)
* [Gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

### How-to disable  Intel pstate driver
(default for Intel Sandy Bridge and Ivy Bridge CPUs on kernel 3.9 and upper)
To change back to the ACPI driver, reboot and add to the kernel line `intel_pstate=disable`
Then execute modprobe acpi-cpufreq and you should have the ondemand governor available.

You can make the changes permanent by editing /etc/default/grub and adding
```
GRUB_CMDLINE_LINUX_DEFAULT="intel_pstate=disable"
```
Then update grub.cfg
```
sudo update-grub
or
sudo grub-mkconfig -o /boot/grub/grub.cfg
```
Follow [the instructions](https://wiki.archlinux.org/index.php/CPU_frequency_scaling) for Arch kernel module loading and add the acpi-cpufreq module.
