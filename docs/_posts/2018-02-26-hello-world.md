---
layout: post
title:  "Welcome To CPUFREQ Place!"
date:   2018-02-26 21:02:00 +0200
categories: cpufreq news
description: I know I'm late but better later than never. Many Linux users are geeks but times change and more and more non-technician people are coming to our beloved desktop. They start to ask questions about many aspects of Linux OS and how to find the right solution. I will post news, collect and share our knowledge base and more.<br><br>It was my first Gnome Extension and Gnome JavaScript experience! My not too old laptop had fried and this driven me to take control under my system and find some solution for monitoring and managing system parameters. Unfortunately, there was no supported version's extension for my modern Gnome desktop 3.14:). I decided to adopt an old extension it moved me to learn a lot about Gnome creation Gnome extensions and GJS. But first working prototype I got in less than 24 hours! So guys let it doesn't stop you! Sadly, I couldn't find the blog that helped me understand step by step how to convert standard extension template to something useful.
image: "/assets/images/posts/welcome.png"
---

# Welcome To CPUFREQ Place!
<img alt="WELCOME" src="{{ "/assets/images/posts/welcome.png" | relative_url }}" align="left" style="margin:0 48px 12px 0">

I know I'm late but better later than never. Many Linux users are geeks but times change and more and more non-technician people are coming to our beloved desktop. They start to ask questions about many aspects of Linux OS and how to find the right solution. I will post news, collect and share our knowledge base and more.<br>
It was my first Gnome Extension and Gnome JavaScript experience! My not too old laptop had fried and this driven me to take control under my system and find some solution for monitoring and managing system parameters. Unfortunately, there was no supported version's extension for my modern Gnome desktop 3.14:). I decided to adopt an old extension it moved me to learn a lot about Gnome creation Gnome extensions and GJS. But first working prototype I got in less than 24 hours! So guys let it doesn't stop you! Sadly, I couldn't find the blog that helped me understand step by step how to convert standard extension template to something useful.
## History
<img title="Version 1" src="{{ "/assets/images/posts/version_1.png" | relative_url }}" align="left" height="280px" style="margin:0 48px 12px 0">
We'll do not look back to all old versions. We are looking forward! I just wanted to mention the creation of the 1st version, what we achieved and where are we going here.<br>
There is the image of my first version on intel_pstate mode. ACPI cpufreq version didn't have frequency sliders at all. I'm not sure even about the turbo boost switch. **The first release features:**
* a simple frequency monitor on GLib timeout for every 2 seconds;
* ability to change processor governors;
* turbo boost switcher (_intel_pstate_);
* frequency sliders (_intel_pstate_).

**Now we have much more:**
* cpufreq-service allows monitoring in a standalone glib process in milliseconds.
* all standard features like governors, frequencies and turbo boost for both current driver models (acpi-cpufreq and intel_pstate).
* ability to remember current settings to restore after reloading.
* custom user profiles manager.
* kernel switching on/off for CPU core threads.
* checking for some important system parameters on the application pop-up:
 1. `system loading` to detect big system activity;
 2. `thermal throttle` it's more important than temperature monitoring because it doesn't lie;
 3. `irqbalance detection` it's not very useful for desktop usage and could be a cause of the system stability;
* supporting Gnome Shell from 3.14 version;
* pre-released feature to change user profiles on power events from batteries.
* friendly informational panel **:)**

**Future plans:**
* improve and make this place more useful and user-friendly;
* add support to the next version of Gnome Shell 3.28;
* make GTK version of the extension as a standalone application. It makes possible to use this functionality on any Linux desktop environment including next Gnome Shell 4 version.

## Contributing
_All this is impossible without you!_ says even open-source organizations behind corporations. Actually, it's hard work to take own time from all other important things to provide you worthy supporting and frequent updates and new features. The testing, tracking, mailing, and other activities need a lot of time and efforts. So we all know how big the Linux World and almost every configuration is unique.
**The project is waiting for your contribution. Because it's the main idea of the open-source moving and impossible without you!** _I'm glad to see more and more people involved in the Open World._

## Thank you, guys!
_Thanks to all project contributors. Special thanks to [Térence Clastres](https://github.com/terencode) and [Ricardo Rodrigues](https://github.com/RicardoEPRodrigues). They have contributed a lot of their time to make this project better. I'm pretty sure you could notice at least one of them in each discussion or issue on GitHub._

**We are glad to see you here!**
