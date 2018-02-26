---
title: Overview
permalink: /overview/
description: Gnome Shell CPU Frequency Monitor and Governor Manager. This is a lightweight CPU scaling monitor and powerful CPU management tool. The extension is using standard cpufreq kernel modules to collect information and manage governors. It needs root permission to able changing governors.
---

## Features
<img alt="screenshot" src="{{ "/assets/images/screenshot.png" | relative_url }}" align="right" height="192" style="margin:0 32px">

* Compatible with many hardware architectures (x86, x64, arm ...);
* CPU Frequency monitoring;
* CPU Governor management;
* CPU Frequency speed limits;
* CPU Boost supporting;
* CPU Power on/off supporting;
* Saving/Restoring settings;
* User Profiles;
* More.

# TIPS
## A Few Reasons Why You Should Not Want To Use Single Core For _powersaving mode_:
* Modern OS/kernel works better on multi-core architectures.
* You need at least 1 core for a foreground application and 1 for the background system services.
* Linux Kernel is changing CPU cores to avoid overheating, thermal throttle and to balance system loading.
* Many CPUs have enabled Hyper-Threading (HT) technology. So there is no big sense to run 0.5 physical CPU core.
* ...
