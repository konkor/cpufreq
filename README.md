# cpufreq
Gnome Shell 3.14+ CPU Frequency Monitor and Governor Manager

## Install
### Dependencies
* Gnome Shell >= 3.14+
* cpufrequtils >= 008 (sudo apt-get install cpufrequtils)

### From source
```
git clone https://github.com/konkor/cpufreq
cd cpufreq
```
### Edit user home folder in konkor.cpufreq.policy
```
gedit konkor.cpufreq.policy

mkdir -p ~/.local/share/gnome-shell/extensions/cpufreq@konkor

cp cpufreqctl extension.js metadata.json konkor.cpufreq.policy ~/.local/share/gnome-shell/extensions/cpufreq@konkor/

sudo cp konkor.cpufreq.policy /usr/share/polkit-1/actions/
```
Last row is to able change governors

### Source and packages
* [GitHub](https://github.com/konkor/cpufreq)

## Screenshots
![](/data/screenshots.png?raw=true)

