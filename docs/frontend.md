---
title: User Interface
permalink: /frontend/
description: This section describes the user interface and features.
---

# Overview of the User Interface (UI)

<img alt="elements" src="{{ "/assets/images/elements.png" | relative_url }}" align="left" height="576" style="margin:0 32px">
## UI Elements

1. [Frequency Indicator](#1-frequency-indicator)
2. [Info Panel](#2-info-panel)
3. [CPU Governors Section](#3-cpu-governors-section)
4. [Userspace Governor Section](#4-userspace-governor-section)
5. [Minimal Frequency Slider](#5-minimal-frequency-slider)
6. [Maximum Frequency Slider](#6-maximum-frequency-slider)
7. [CPU Core Threads Slider](#7-cpu-core-threads-slider)
8. [CPU Turbo Mode Switcher](#8-cpu-turbo-mode-switcher)
9. [User Profiles Section](#9-user-profiles-section)
10. [Preferences Section](#10-preferences-section)

## 1. Frequency Indicator

The Frequency Indicator shows the current maximum CPU frequency on the active CPU core thread. It could help to see your settings modification and monitor activity of the system at all. It can be useful to detect some activity on the system when you don't expect it.

The default frequency monitoring interval can be changed in the _Preferences_ window.

_IMPORTANT: frequency monitoring doesn't require a lot of system resources but It'd be nice to not go to the very low values. **It's milliseconds (1000 times per second)** Otherwise, your system could be busy with the monitoring only or even have bugs. I recommend you open the system monitor and check `cpufreq-service` process when you are changing the settings to see the service loading. You can check system journal for fail messages._

## 2. Info Panel

### System Status
![System Status States]({{ "/assets/images/system_status.png" | relative_url }})
1. ☺ **ALL OK** the extension cannot detect any supported issues on your system.
2. 😐 **WARNING** the extension detected some minor issues like **IRQBALANCE DETECTED** or **SYSTEM BUSY**.
3. ☹ **CRITICAL** the extension found some critical issues like **SYSTEM OVERLOAD**, **CPU THROTTLE**,  **THROTTLE SPEED**.

_See more here:_ [System Status Messages](#system-status-messages)

### CPU Model Name
Here is all clear. It shows an information about the CPU Model Name.
### OS Release information
Here are the Linux Distribution Name and the short major kernel version.
### Loading Indicator
It shows a percentage of the system loading for the last minute activity and a symbolic presentation of it. Every full circle represents 100% of the core loading.

_See more here:_ [What is CPU loading in Linux?]({{ "/faq/#what-is-cpu-loading-in-linux" | relative_url }})
### System Status Messages
They are trying to make your attention to some issues on your system. The extension's checking for the several issues.
1. **CPU Loading issues** _(See the [Loading Indicator](#loading-indicator) section...)_
2. **THERMAL THROTTLE issues** Here is two message types:
* **CPU THROTTLE** shows what is your CPU had a critical temperature and some core threads went off for the _COUNT OF MISSED CPU CYCLES_.
* **THROTTLE SPEED** shows CPU has _critical temperature_ **right now** and shows _NUMBER MISSING CPU CYCLES_ per second.
_See more here:_ [What is CPU thermal throttle?]({{ "/faq/#what-is-cpu-thermal-throttle" | relative_url }})
3. **IRQBALANCE DETECTED** _irqbalance_ package can affect the system stability and power usage. It's important, especially, for mobile devices in the first place but it affects all devices and can reduce the battery life or system devices lifetime.
4. **Governors** You can see the information about governors if there is a **mixed mode** when different CPU could have different active governors.

_See discussion on GitHub about_ [the issue](https://github.com/konkor/cpufreq/issues/48)

## 3. CPU Governors Section
![]({{ "/assets/images/governors.png" | relative_url }})
Here is you can select an available CPU governor. The governors allow managing the CPU in different ways. Also, their names tell about them in most cases like powersave is for power saving etc. You can have the different number of available governors it depends on the current ACPI mode and loaded kernel modules.

The head of the section (submenu) shows the active governor. Also, it can show [Mixed mode]({{ "/faq/#what-is-a-mixed-mode" | relative_url }}) when core threads have different governors.  The child menu items present system governors.

_See more about_ [CPU governors]({{ "/faq/#what-is-cpu-governors" | relative_url }})

## 4. Userspace Governor Section
<img alt="userspace" src="{{ "/assets/images/userspace.png" | relative_url }}" align="right" height="240" style="margin:0 48px">
_Userspace Governor is available on the kernel acpi-cpufreq driver only._

Userspace Governor allows you to set one of the available CPU Frequencies when cores have a constant frequency and a minimal core frequency equal to the maximum frequency. It could be useful for testing purposes to test an application performance scaling for example.

_See more about_ [CPU governors]({{ "/faq/#what-is-cpu-governors" | relative_url }})

## 5. Minimal Frequency Slider
Each processor core (thread) can have minimal allowed frequency value where processor core can't go lower less than specified.
It could be useful to increase the system responding when processor core doesn't go too low states and ready to work on the higher frequencies.

## 6. Maximum Frequency Slider
Each processor core (thread) can have maximum allowed frequency value where processor core can't go upper more than specified.
It could be useful to reduce the system power consumption when processor core doesn't go too high states.

## 7. CPU Core Threads Slider
**You have to disable/remove IRQBALANCE package for the system stability!**

_This feature is available on multi-core processors only._

You can just turn off or on the processor cores through the Linux kernel. It can be useful for reducing of power consumption or testing purposes like application scaling analyses.

## 8. CPU Turbo Mode Switcher
_This feature is available on the supported processor models only._

You can just turn off or on a processor boosting feature through the Linux kernel. A processor boosting feature allows CPU to go to higher of the standard frequencies for short time only. It's dramatically increasing processor power consumption and heating.
It's a good idea to turn it off for laptops because usually laptop cooling system is weak and can easily get hot but not down.

_It's usually good idea to switch turbo boost off on laptops. If you want to increase the system responding on a laptop you could just increase minimal frequency value to do so._

## 9. User Profiles Section
<img alt="profiles" src="{{ "/assets/images/profiles.png" | relative_url }}" align="right" style="margin:0 32px">


## 10. Preferences Section
![]({{ "/assets/images/preferences.png" | relative_url }})
