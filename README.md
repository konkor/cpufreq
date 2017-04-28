# cpufreq
Gnome Shell CPU Frequency Monitor and Governor Manager.

https://extensions.gnome.org/extension/1082/cpufreq/

![](/data/screenshots.png?raw=true)

This is a lightweight CPU scaling monitor and powerful CPU management tool. The extension is using standard cpufreq kernel modules to collect information and manage governors. It needs root permission to able changing governors.

## Features
* Compatible with many hardware architectures (x86, x64, arm ...);
* CPU Frequency monitoring;
* CPU Governor management;
* CPU Frequency speed limits;
* CPU Boost supporting;
* CPU Power on/off supporting;
* Saving/Restoring settings;
* More.

## A Few Reasons Why You Should Not Want To Use Single Core For _Powersaving_:
* Modern OS/kernel better works on multi core architectures.
* You need at least 1 core for foreground application and 1 for system services.
* Linux Kernel is changing CPU cores to avoid overheating and thermal throttle.
* ...

[Phoronix Benchmarks](http://www.phoronix.com/scan.php?page=article&item=linux-47-schedutil&num=1)

Optional you can install cpufrequtils or cpupower package:

* Debian/Ubuntu
```
sudo apt-get install cpufrequtils
```
or for modern kernels:
```
sudo apt-get install linux-cpupower
```
* Arch Linux
```
sudo pacman -S cpupower
```
* Fedora
```
yum install kernel-tools
```

## Install
### Dependencies
* Gnome Shell 3.14+;
* supported cpufreq modules.

### You could fix executing bit after installation to able to change governors
[extensions.gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)

```
cd ~/.local/share/gnome-shell/extensions/cpufreq@konkor
chmod +x cpufreqctl
```
If you want change governors or/and frequencies You have to install it.
```
sudo ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl install
```

### From source zip archive
Download zip archive from github page. Run _gnome-tweak-tool_ go to extensions tab,
click _Install Shell Extension_ from drive and select _cpufreq-master.zip_.
Detailed steps below:
```
$wget https://github.com/konkor/cpufreq/archive/master.zip
$gnome-tweak-tool # Select 'Install Shell Extension' button on the Extensions Tab.
$chmod +x ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
Now close _gnome-tweak-tool_ and restart _gnome-shell_ Log Out or just enter 'r' command in 'Alt-F2' prompt.
```
$gnome-tweak-tool # Turn on the extension.
cpufreq extension => ⚠ Install...
```

### From git source
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
1. _Cpufreq_ applet is now installed and its menu is now display in GNOME top toolbar
1. Done. You have successfully installed _Cpufreq_.

Optionally, if you need to install _Cpufreq_ for an additional GNOME user(s), but that user(s) do not have super user/Administrator/Root access, here are the steps that will allow that user to change the governors from the _Cpufreq_ applet
1. Login that additional GNOME user(s)
1. Run all the same command lines as [that section above](https://github.com/konkor/cpufreq/blob/master/README.md#from-git-source)
1. Open GNOME _Tweak Tools_ (gnome-tweak-tool). Click on _Extensions_ vertical tab.
1. Next to _Cpufreq_ row click on the toggle button to turn it ON
1. Restart GNOME by pressing "Alt+F2' keys. When prompt type in "r" without the quotes. Press "Enter" key. Wait a few seconds for GNOME to refresh.
1. _Cpufreq_ applet is now installed and its menu is now display in GNOME top toolbar
1. Done. You have successfully installed _Cpufreq_.

### Updating the existing extension from git source
1. $wget https://github.com/konkor/cpufreq/archive/master.zip
1. Extract _cpufreq-master.zip_.
1. Copy/Replace all files in the _~/.local/share/gnome-shell/extensions/cpufreq@konkor_ folder.
1. Restart GNOME by pressing "Alt+F2' keys. When prompt type in "r" without the quotes. Press "Enter" key.

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
