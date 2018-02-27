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
A CPU governor is an algorithm used to automatically switch between different CPU frequencies, generally based on the system loading. It allows CPU frequency scaling to save power.
For more information, check out [the kernel documentation about governors](https://www.kernel.org/doc/Documentation/cpu-freq/governors.txt).

## What is a MIXED mode
<img alt="" src="{{ "/assets/images/mixed_mode.png" | relative_url }}" align="right" style="margin:0 48px">
The mixed mode is a system state when processor cores can have different active governors (see [the picture](/assets/images/mixed_mode.png)). This mode can be used for the power saving like an alternative to the switching cores off by selecting less power hungry governors and frequencies on desired cores.

**the mixed mode usage:**

We have 4 cores processor and want to make two groups: 1 core - performance mode and 3 cores in powersave mode. To do so we have to repeat next steps:
1. Turn off _Remember Settings_ option.
2. Enable all 4 cores.
3. Set **powersave governor** for all cores (we have to start from the end of our groups).
4. (**acpi-cpufreq only**) Optionally, we can adjust frequencies too.
5. Turn off 3 processor cores (we should have only 1 active core after the procedure).
6. Set **performance governor** and adjust frequencies (**acpi-cpufreq only**).
7. Finally, turn on all cores again. You should have the mixed mode with 2 different governors on the processor.
8. Optionally, you can save current settings in a custom profile for later.

## What is CPU loading in Linux
Accessible through ``top`` or ``uptime`` on UNIX systems, the cpu/system load is an averaged representation of the computer's charge of work during a certain period of time. It's calculated based on the number of process running or waiting for the CPU.

## What is CPU thermal throttling
CPU thermal throttling is a security measure put in place to dynamically scale down the processor frequency when reaching a high temperature threshold.

## IRQBALANCE DETECTED
_See discussion on GitHub about_ [the issue](https://github.com/konkor/cpufreq/issues/48)
