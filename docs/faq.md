---
title: FAQ
permalink: /faq/
description: Frequently Asked Questions.
---

## How-to disable  Intel pstate driver

_(default for Intel Sandy Bridge and Ivy Bridge CPUs on kernel 3.9 and upper)_
To change back to the ACPI driver, add `intel_pstate=disable` to your kernel parameters and reboot.
Then execute modprobe acpi-cpufreq and you should have the ondemand governor available.

You can make the changes permanent by adding the following to _/etc/default/grub_:
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

## What is a CPU governor
A CPU governor is an algorithm used to automatically switch between different CPU frequencies, generally based on the system load. It allows CPU frequency scaling to save power.
For more information, check out [the kernel documentation about governors](https://www.kernel.org/doc/Documentation/cpu-freq/governors.txt).

## What is a MIXED mode
// TODO

## What is CPU loading in Linux
Accessible through ``top`` or ``uptime`` on UNIX systems, the cpu/system load is an averaged representation of the computer's charge of work during a certain period of time. It's calculated based on the number of process running or waiting for the CPU.

## What is CPU thermal throttling
CPU thermal throttling is a security measure put in place to dynamically scale down the processor frequency when reaching a high temperature threshold.

## IRQBALANCE DETECTED
_See discussion on GitHub about_ [the issue](https://github.com/konkor/cpufreq/issues/48)
