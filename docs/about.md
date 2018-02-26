---
title: About
permalink: /about/
description: A Gnome-Shell CPU Frequency Monitor and Governor Manager extension. <br />This is a lightweight CPU scaling monitor and a powerful CPU management tool using standard cpufreq kernel modules to collect information and manage governors.
---

## Features
<img alt="screenshot" src="{{ "/assets/images/screenshot.png" | relative_url }}" align="right" height="192" style="margin:0 32px">

* Compatible with many hardware architectures (x86, x64, arm ...);
* CPU Frequency monitoring;
* CPU Governor management;
* CPU Frequency speed limits;
* CPU Boost support;
* CPU Power on/off support;
* Back-Up and Restore settings;
* User Profiles;
* And More!

# TIPS
## A Few Reasons Why You Should Not Use Single Core For _powersaving mode_:
* Moderns OS/kernel work better on multi-core architectures.
* You need at least 1 core for a foreground application and 1 for background system services.
* Linux Kernel switches between CPU cores to avoid overheating, CPU thermal throttling and to balance system load.
* Many CPUs have Hyper-Threading (HT) technology enabled by default. So there is no reason to run half of a physical CPU core.
* ...
