# cpufreq
Gnome Shell 3.14+ CPU Frequency Monitor and Governor Manager.
https://extensions.gnome.org/extension/1082/cpufreq/

![](/data/screenshots.png?raw=true)

This is lightweight gnome-extension for CPU scaling monitor and power governor's management. The extension is using standard cpufrequtils package to collect information and manage governors. It's need root permission to able changing governors or install policy for pkexec.

Please install cpufreq-utils:

* Debian/Ubuntu
```
sudo apt-get install cpufrequtils
```

## Install
### Dependencies
* Gnome Shell >= 3.14+
* cpufrequtils >= 008 (sudo apt-get install cpufrequtils)

### You need fix executing bit after installation to able to change governors
```
cd ~/.local/share/gnome-shell/extensions/cpufreq@konkor
chmod 0755 cpufreqctl
```
If you want change governors without asking root password each time You need edit user home folder in konkor.cpufreq.policy and install it. Change 'USERNAME' to user's real name.
```
gedit konkor.cpufreq.policy
sudo cp konkor.cpufreq.policy /usr/share/polkit-1/actions/
sudo chown root:root ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```

### From source
```
git clone https://github.com/konkor/cpufreq
cd cpufreq
```
Edit user home folder in konkor.cpufreq.policy
```
gedit konkor.cpufreq.policy

mkdir -p ~/.local/share/gnome-shell/extensions/cpufreq@konkor
cp cpufreqctl extension.js metadata.json konkor.cpufreq.policy ~/.local/share/gnome-shell/extensions/cpufreq@konkor/
chmod 0755 ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl

sudo cp konkor.cpufreq.policy /usr/share/polkit-1/actions/
sudo chown root:root ~/.local/share/gnome-shell/extensions/cpufreq@konkor/cpufreqctl
```
Last rows are to able change governors without asking super user password when you changing governors from the applet.

### Source and packages
* [GitHub](https://github.com/konkor/cpufreq)
* [Gnome.org](https://extensions.gnome.org/extension/1082/cpufreq/)
