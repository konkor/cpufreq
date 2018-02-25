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

_IMPORTANT: frequency monitoring doesn't require a lot system resources but It'd be nice to not go to the very low values. **It's milliseconds (1000 times per second)** Otherwise your system could be busy by the monitoring only or even have a bugs. I recommend you open the system monitor and check `cpufreq-service` process when you are changing the settings to see the service loading. You can check system journal for fail messages._

## 2. Info Panel

### System Status
![System Status States]({{ "/assets/images/system_status.png" | relative_url }})
1. ☺ **ALL OK** the extension cannot detect any supported issues on your system.
2. 😐 **WARNING** the extension detected some minor issues like **IRQBALANCE DETECTED** or **SYSTEM BUSY**.
3. ☹ **CRITICAL** the extension found some critical issues like **SYSTEM OVERLOAD**, **CPU THROTTLE**,  **THROTTLE SPEED**.

_**TODO** THERMAL THROTTLE_

### CPU Model Name
Here is all clear. It shows an information about the CPU Model Name.
### OS Release information
Here is the Linux Distribution Name and the short major kernel version.
### Loading Indicator
It shows percentage of the system loading for the last minute activity and a symbolic presentation of it. Every full circle represents 100% of the core loading.

_**TODO** loading_
### System Status Messages
They are trying to make your attention to some issues on your system. The extension's checking for the several issues.
1. **CPU Loading issues** _(See the [Loading Indicator](#loading-indicator) section...)_
2. **THERMAL THROTTLE issues** Here is two message types:
* **CPU THROTTLE** shows what is your CPU had a critical temperature and some core threads went off for the _COUNT OF MISSED CPU CYCLES_.
* **THROTTLE SPEED** shows CPU has _critical temperature_ **right now** and shows _NUMBER MISSING CPU CYCLES_ per second.
_**TODO** CPU THERMAL THROTTLE_
3. **IRQBALANCE DETECTED** _irqbalance_ package can affect the system stability and power usage. It's important, especially, for mobile devices in the first place but it affect all devices and can reduce the battery life or system devices lifetime.
4. **Governors** You can see the information about governors if there is a **mixed mode** when different CPU could have different active governors.

_See discussion on GitHub about_ [the issue](https://github.com/konkor/cpufreq/issues/48)

## 3. CPU Governors Section
![]({{ "/assets/images/governors.png" | relative_url }})
## 4. Userspace Governor Section
![]({{ "/assets/images/userspace.png" | relative_url }})
## 5. Minimal Frequency Slider

## 6. Maximum Frequency Slider

## 7. CPU Core Threads Slider

## 8. CPU Turbo Mode Switcher

## 9. User Profiles Section
![]({{ "/assets/images/profiles.png" | relative_url }})
## 10. Preferences Section
![]({{ "/assets/images/preferences.png" | relative_url }})
