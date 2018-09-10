---
title: Getting started
permalink: /start/
description: We'll consider a creation of some basic user profiles here. Also, we'll learn how to manage user profiles and dig a little into some aspects of the Linux System.
---

# Table of contents
1. [Power saving profile](#power-saving-profile).
1. [Daily profile](#daily profile).
1. [Performance profile](#performance-profile).
1. [Usage of the profile manager](#usage-of-the-custom-user-profiles).

## Power saving profile
We should know CPU consume less power when it idle. To achieve it our processor has to make system tasks quickly enough and switch to low-frequency states to save more energy. Modern operating systems have a lot active and passive program threads it's a few hundred threads. You can check it:
```
$ cat /proc/loadavg
## OUTPUT CAN BE SOMETHING LIKE THIS
## 0.14 0.21 0.15 1/722 6524
## 1/722 shows ACTIVE/LOADED threads count
```
<p class="description">By default on the loading some application, its framework will try to separate application to a few sub-threads: main application loop, GIO, GLIB, Gtk render etc. That all depend on application framework and architecture.</p>
Linux kernel gives some time to every process/thread/task in a loop _mainloop_ even if it doesn't have what to do. It's why I recommend using dynamic governors even for power saving modes. A processor should make this loop quickly and back to the idle state to save energy.

Second, hot CPU consume more energy. It happens when a processor works on the higher frequency values. Turbo Boost mode is temporary overclocking a few CPU cores for short time. This feature can give extra arithmetic power to the system but a standard cooling system cannot cool down the processor enough. Then CPU turn on a protecting mechanism - CPU thermal throttle. It's off hot processor cores to cool down and drops frequency values for while.
<p class="description">Usually, laptops have much weaker and smaller cooling system than desktop PC. Today, manufacturers make more and more slim laptops to make them cheaper. So it's a good idea to avoid overclocking at all in many cases. It's better to have a stable system all the time than 1-5 minutes `super quick` system and then you get lags, overheating components and bigger problems. But all depends on the model, system usage, how it new and clean.</p>

We have to keep that all in mind. Higher, longtime system loading, very high frequencies (especially, Turbo Boost modes), weak cooling, and secondary temperature are main enemies of the battery life. So basic concepts to enhance battery life is:
* Turbo Boost must be off.
* The governor has to be dynamic to execute background system processes fast enough. It's _Powersave_ governor for the intel_pstate driver or _Ondemand_ for the acpi_cpufreq driver.
* Minimal frequency should have minimal possible value.
* Maximum frequency can be 50-100% it depends on how many background processes running and the activity. You could start from 50-70% and take a look at CPU loading _(See the [Loading Indicator](/cpufreq/frontend/#loading-indicator) section...)_. If you have too high loading more than 30-40% you have to increase maximum frequency value.
* Optional, you can try to turn off 50% cores (for 4 core processor - 2 off).
* Optional, you can use Mixed mode: 1-2 cores ondemand and others - static powersave (_acpi_cpufreq only_). See [What is a MIXED mode](/cpufreq/faq/#what-is-a-mixed-mode).
<p class="description">Important: you have to disable/remove <i>IRQBALANCE</i> to use the feature of switching cores safely. <i>See more about</i> <a href="{{ "/faq/#irqbalance-detected" | relative_url }}">IRQBALANCE DETECTED</a>.</p>
<p class="description">If you have Hyper-Threading enabled when one physical core can have two separated threads, it's a good idea to apply same changes to pair threads. Don't use a single core even for power saving so. <i>See</i> <a href="{{ "/faq/#" | relative_url }}">Why I should not use a single core for power saving?</a></p>
_Save the new settings to a new profile._

[Top](#)

## Daily profile
Here is all depend on your system usage and what do you want to achieve a bit energy saving or responsiveness. I'd recommend next:
* I like to keep CPU cool and turning off Turbo Boost even on Desktop too.
* The governor can be _Performance_ governor for the intel_pstate driver or _Ondemand_, _Schedutil_, _Conservative_ for the acpi_cpufreq driver or any you need.
* If you want to add more responsiveness to the system you can up Minimal frequency value. I like it more than Turbo Boost.
* If you want to save some energy you can decrease Maximum frequency value to 80% for an example.
* You can mix a Mixed mode with different governors so.
* You can switch off extra cores.
* You can combine all these methods together or create a few profiles for different use cases.

_Save the new settings to a new profile._

[Top](#)

## Performance profile
It's similar to creating of a Daily profile. All depend on what do you want: stability, responsiveness, maximum performance, avoid thermal throttle etc. You can create several profiles for performance tasks.
* _Performance_ governor is good choice to achieve a quick result but on the acpi_cpufreq driver, you can use any mode for different cases.
* If you want to have a more responsive system you can up Minimal frequency value for dynamic governors.
* You can limit Maximum frequency value and disable Turbo Boost if you have stability issues on long tasks or thermal throttle.

_Save the new settings to a new profile._

[Top](#)

## Usage of the custom user profiles

See [User Profiles Section]({{ "/frontend/#9-user-profiles-section" | relative_url }})

[Top](#)
