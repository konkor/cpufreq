---
title: FAQ
permalink: /faq/
description: Frequently Asked Questions.
---

## How-to disable  Intel pstate driver

_(default for Intel Sandy Bridge and Ivy Bridge CPUs on kernel 3.9 and upper)_
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

## What is this CPU loading
//TODO

## What is this CPU thermal throttle
//TODO
