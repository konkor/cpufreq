---
layout: post
title:  "Debugging, again!"
date:   2018-11-25 00:00:00 +0300
categories: cpufreq news howto blog
description: I just received a user bug report from Gnome Extensions again. It's not first time I'm getting reports but maybe just now I have noticed users don't know what information to include or how to just debug Gnome extensions.
image: "/assets/images/posts/bugs.png"
comments: true
author: "konkor"
---

# Sometimes things going wrong!
<img alt="" src="{{ "/assets/images/posts/bugs.png" | relative_url }}" align="left" style="margin:8px 24px 12px auto;max-width:100%;max-height:120px">

I just received a user bug report from [Gnome Extensions](https://extensions.gnome.org/) again. It's not first time I'm getting reports but maybe just now I have noticed users don't know what information to include or how to elementary debug Gnome extensions.

So I decided to talk a bit about and point maybe users in the right direction here.


### I received that message:

```txt
Your extension, "cpufreq" has received an error report from USERNAME:

What's wrong?
When installed in Manjaro Gnome edition, changing from one saved profile to another,
locks the whole system (or maybe just the display) for five seconds and sends
CPU usage spiking.  I've used your extension in many different distros (in the past
week even) and this is the only time I've seen the behavior.  It also happens during
automated profile changed, like when the computer is unplugged, or plugged back in.

What have you tried?
Uninstalled and reinstalled the extension.  This is a fresh install.
Please let me know if there is any data I can collect for you.

Automatically detected errors:

GNOME Shell Extensions did not detect any errors with this extension.

Version information:

    Shell version: 3.30.1
    Extension version: 27

Please email the reporter back to respond. The user's address is:

user@gmail.com

You can see the full report at:

https://extensions.gnome.org/errors/view/4823

The error reporting service provided by GNOME Shell Extensions is not a fully-
featured ticket tracker and does not aim to replace a ticket tracker.

—
This email was sent automatically by GNOME Shell Extensions. Do not reply.
```

### Sometimes even such information could help!

It can point developers to make attention on the next testing distribution choosing. But usually it's not enough. We need more information to make that testing and debugging more successful and make a quick fix and help you.

Actually, It's often not easy to do. I can't have all hardware variations to test on it. I don't have any laptop now to example to test power profiles. Actually, I don't have even modern CPU to test all features. I'm testing some features even remotely sometimes. If you want to help me to buy some hardware or to get a motivation, consider to donate a couple bucks, look at  [donations page](http://konkor.github.io/cpufreq/donations/) and become a supporter or even sponsor.

So you should help yourself first. At least you could provide detailed information to help other users.

My reply was like that:

```txt
Thank you for the report.

It could be a lot of causes of such behavior. You can help:

1) Provide some more info about your hardware and system like:
 * Intel or AMD CPU
 * intel_pstate or acpi_cpufreq CPU driver
 * Kernel version
 * IRQ Balance enabled or disabled...

2) Debug the extension:
 * Open https://extensions.gnome.org/local/ page or
 run gnome-shell-extension-prefs to temporary disable all other extensions.
 Restart Gnome Shell to check if it helps. Sometimes the issue could be in other
 installed extensions.

 * Open systemd journal in monitor mode, run:
    sudo journalctl -f
    and restart shell via Alt+F2 r command to see all startup messages from
    shell and extensions.
    Do not close the monitor in terminal. Open extension menu and try to change
    profiles and/or other settings. You could see maybe some warnings, errors or
    when it locks.

 * Report the issue on github https://github.com/konkor/cpufreq/issues
 It can help to detect the issue or maybe some users even already have solution.

Regards, konkor.
```

### We Have Troubleshooting Section

But looks like it needs an improving. I decided to enhance a bit that section to at least to point users to right direction.

[Troubleshooting Section of Installation Guide](http://konkor.github.io/cpufreq/install/#troubleshooting)

**Good luck in your tinkering! :)**
