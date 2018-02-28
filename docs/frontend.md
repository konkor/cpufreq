---
title: User Interface
permalink: /frontend/
description: A description of the UI (User Interface) and its features.
---

# Overview

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

The Frequency Indicator shows the current maximum CPU frequency on the active CPU core thread. It helps to visualize your setting's modifications and to monitor the system activity. It can be useful to detect abnormal activities on the system when it should be idle.

The default frequency monitoring interval can be changed in the [Preferences window](#10-preferences-section).

_IMPORTANT: frequency monitoring doesn't require a lot of system resources but you shouldn't go for very low values. **It's milliseconds (1000 times per second).** Otherwise, your system could be busy with the monitoring only or even have bugs. I recommend you to open the system monitor and check the `cpufreq-service` process when you are changing the settings to see the service loading usage. You can check the system journal (`sudo journalctl -f`) for messages reporting failures._

## 2. Info Panel

### System Status
![System Status States]({{ "/assets/images/system_status.png" | relative_url }})
1. ☺ **ALL OK** the extension do not detect any (supported) issues on your system.
2. 😐 **WARNING** the extension detected some minor issues like **IRQBALANCE DETECTED** or **SYSTEM BUSY** messages.
3. ☹ **CRITICAL** the extension found some critical issues like **SYSTEM OVERLOAD**, **CPU THROTTLE**,  **THROTTLE SPEED** messages.

_See more about_ [System Status Messages](#system-status-messages)

### CPU Model Name
Shows the CPU Model Name.
### OS Release information
Shows the Linux Distribution Name and the short major kernel version.
### Loading Indicator
Shows a percentage of the system load from for the last minute's activity and its symbolic representation. Each full circle represents 100% of the core load.

_See more here:_ [What is CPU loading in Linux?]({{ "/faq/#what-is-cpu-loading-in-linux" | relative_url }})
### System Status Messages
Focus your attention to some potential issues on your system among the following:
1. **CPU LOAD issues** _(See the [Loading Indicator](#loading-indicator) section...)_
2. **THERMAL THROTTLING issues** Two message types:
* **CPU THROTTLING** means your CPU hit a critical temperature and some core threads went off for the _COUNT OF MISSED CPU CYCLES_.
* **THROTTLING SPEED** means your CPU is hitting _critical temperature_ **right now** and shows _NUMBER MISSING CPU CYCLES_ per second.
_See more about_ [thermal throttling?]({{ "/faq/#what-is-cpu-thermal-throttle" | relative_url }})
3. **IRQBALANCE DETECTED** _irqbalance_ package can affect the system stability and power usage. It's important, especially, for mobile devices in the first place but it affects all devices and can reduce the battery life or system devices lifetime.
_See more about_ [IRQBALANCE DETECTED]({{ "/faq/#irqbalance-detected" | relative_url }})
4. **Governors** You can see governors information if you set up a **mixed mode** where different CPU core are assigned to different active governors.
_See more about_ [mixed mode]({{ "/faq/#what-is-a-mixed-mode" | relative_url }})

## 3. CPU Governors Section
<img alt="governors" src="{{ "/assets/images/governors.png" | relative_url }}" align="left" style="margin:0 48px">

Here you can select the available CPU governor. The governors allow to manage the CPU in different ways. Also, their names are generally explicit like _powersave_ is for power saving etc. You can have a different number of available governors as it depends on the current ACPI mode and loaded kernel modules.

The section's header (submenu) shows the active governor. Also, it can show [Mixed mode]({{ "/faq/#what-is-a-mixed-mode" | relative_url }}) when core threads have different governors. The child menu items represent system governors.

_See more about_ [CPU governors]({{ "/faq/#what-is-a-cpu-governor" | relative_url }})

## 4. Userspace Governor Section
<img alt="userspace" src="{{ "/assets/images/userspace.png" | relative_url }}" align="right" height="240" style="margin:0 48px">
_Userspace Governor is only available with the kernel acpi-cpufreq driver._

Userspace Governor allows you to set one of the available CPU Frequencies when cores have a constant frequency and a minimal core frequency equal to the maximum frequency. It can be used to test an application performance scaling for example.

_See more about_ [CPU governors]({{ "/faq/#what-is-cpu-governors" | relative_url }})

## 5. Minimal Frequency Slider
Each processor core (thread) can have a minimal allowed frequency value and core frequencies can't go lower.
It can be used to increase the overall system reactivity as processor cores can't go too low and instead are ready to work on higher frequencies right away.

## 6. Maximum Frequency Slider
Each processor core (thread) can have maximum allowed frequency value and core frequencies can't go higher.
It can be used to reduce the system power consumption when processor cores can't go too high.

## 7. CPU Core Threads Slider
<p class="description">First, you have to disable/remove IRQBALANCE package for the system stability!</p>

_This feature is only available for multi-core processors._

Allows you to turn off or on processor cores through the Linux kernel. It can be used to reduce the power consumption or for testing purposes like application scaling analyses.

## 8. CPU Turbo Mode Switcher
_This feature is only available for the supported processor models._

Allows you to turn off or on the processor boost feature through the Linux kernel. The processor boost feature allows CPU to go higher than standard frequencies for a limited time only. It dramatically increases processor power consumption and heating.

<p class="description">It's usually a good idea to turn it off for laptops. <i>Usually, laptop cooling system is weak and can easily get hot.</i> If you want to increase the system responsiveness on a laptop you can just increase the minimal frequency slider.</p>

## 9. User Profiles Section
<img alt="profiles" src="{{ "/assets/images/profiles.png" | relative_url }}" align="right" style="margin:0 32px">

User profiles allow the creation of custom power profiles to quickly switch between various application settings. The profiles header shows the current profile. The profile manager has two items by default. First, it's the **New...** item creating a new profile from current settings. You just have to give it a name and press _Enter_ to confirm the creation. Second, it's the default profile automatically created when the application is loading.

After creating a custom user profile you can switch to the saved settings (profile) anytime by clicking on the profile name.

You can delete any user profile just by clicking on its close button **X**.

Also, you can replace any profile with current setting and rename it by clicking on edit button. So just to change some settings, you have to load it, make some changes in the settings and click profile edit button to save current changes to it. You can rename the profile in the editing mode so.

## 10. Preferences Section
<img alt="preferences" src="{{ "/assets/images/preferences.png" | relative_url }}" align="left" style="margin:0 32px">

Here are general settings for the extension:
* **Remember setting** if changes will be automatically saved and restored on next start. The default value is off.
* **Preferences...** opens the preferences window with extra options.
* **Reload** restarting the extension without reloading Gnome Shell.

## Preferences Window
![]({{ "/assets/images/prefs.png" | relative_url }})

From here you can:
* Set **Remember settings** option.
* Set **Frequency Updating interval** option. It describes how often the application monitor will be checking for the current core frequencies. Default value is 500 **milliseconds** (it means 2 times per second). _Don't go to very low values! It could make extra system loading. So human eye cannot even notice this changes._
* Assign user profiles on charging and discharging battery events.
