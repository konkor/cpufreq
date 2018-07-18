---
title: About
permalink: /about/
description: Gnome CPU Frequency Monitor and Governor Manager.<br>This is a lightweight CPU scaling monitor and a powerful CPU management tool using standard cpufreq kernel modules to collect information and manage governors.
---

# Preface

Operating systems have predefined system power profiles and Linux has too. Linux Kernel has the acpi-cpufreq module to manage the system power profiles. But it's not often to see some Linux Desktop Environment (DE) with convenient graphic tools to manage it. This application is giving you a friendly control over Linux system power profiles, frequency monitor, and checks for some related system issues.

<p class="description">Early, Intel wanted to take the power management under its full control with <i>intel_pstate</i> driver. I think it could be useful for dummy OS with very bad processor power management like MS-Dos or the phase between BIOS and Kernel loading to save some power.<br>Recent versions are moving to some kind of the hybrid system of the power management on Linux. We'll see where is it going but now I recommend <i>acpi-cpufreq driver</i>. I think the Linux kernel should know better what's going on on the system and can well manage it itself like on other processors. So modern Intel processors have internal states and reducing the power consumption anyway when a processor core is idle.</p>

Today we have two power management models on Linux OS. First, the standard **acpi-cpufreq** kernel module provides many static and dynamic CPU governors like ondemand (default), powersave, performance, userspace, conservative, schedutil, interactive, custom profiles with a lot of options and separate core profiles configurations. Second, **intel-pstate** presents only two dynamic embedded power profiles: powersave (default) and performance. It can't customize configurations per each core (only profile assigning) and have fewer options.

You can find more information about in [FAQ](/cpufreq/faq).

## Features
<img alt="screenshot" src="{{ "/assets/images/screenshot.png" | relative_url }}" align="right" height="240" style="margin:0 32px">

The main task of the Gnome CPUFREQ is to provide convenient methods to control your system power consumption, performance and monitoring of some critical aspects. You can check the [Welcome post](/cpufreq/news/2018-02-26-hello-world/) and find many interesting pieces of information so.

**Core Features:**
* Compatible with many hardware architectures;
* CPU Frequency monitoring;
* CPU Governor management;
* CPU Frequency speed limits;
* CPU Boost support;
* CPU Power on/off support;
* Back-Up and Restore settings;
* User Profiles;
* And More...

**Planed Features:**
* to make GTK version of the extension as a standalone application. It makes possible to use this functionality on any Linux desktop environment including next Gnome Shell 4 version.
* to enhance control on acpi-cpufreq governor profiles like scaling factors, latencies to make possible creating the custom modified governors/profiles.
* to improve functionality and the documentation.

[Top](#)
