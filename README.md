<p align="center">
  <a href="https://github.com/konkor/cpufreq"><img src="https://img.shields.io/github/license/konkor/cpufreq.svg" alt="GPLv3 License"></a>
  <a href="https://github.com/konkor/cpufreq"><img src="https://img.shields.io/github/stars/konkor/cpufreq.svg?style=social&label=Star&style=flat-square" alt="Stars"></a>
</p>

# [![CPUFREQ](/docs/assets/images/logo.png?raw=true)](https://konkor.github.io/cpufreq/)
### _CPU Monitor and Power Manager_.

<h2 align="center">Supporting CPUFREQ Power Manager</h2>

CPUFREQ Power Manager is an GPLv3-licensed open source project focused on desktop users. It's an independent project with its ongoing development made possible entirely thanks to the support by these awesome [backers](https://github.com/konkor/cpufreq/blob/master/BACKERS.md). You will also support my other interesting community projects. If you'd like to help the project and want to join to it, please consider:

- [Become a backer or sponsor on Patreon](https://www.patreon.com/konkor).
- [One-time donation via PayPal or Patreon.](#donations)

Please, consider to support the project and make it better!

<h3 align="center">Special Sponsors</h3>
<!--special start-->

<p align="center">
  <big>
    Top supporters:<br><br><b>
    <a href="https://konkor.github.io/cpufreq/supporters/">Jonathan Alden</a><br>
    <a href="https://konkor.github.io/cpufreq/supporters/">Manuel Transfeld</a><br>
    <br></b>
    <a href="https://konkor.github.io/cpufreq/supporters/">Roland Jungnickel</a><br>
    <a href="https://konkor.github.io/cpufreq/supporters/">Joël Dinel</a><br>
    <a href="https://konkor.github.io/cpufreq/supporters/">Michel Bonifert</a><br>
    <a href="https://konkor.github.io/cpufreq/supporters/">Patrick Strobel</a><br>
    <br>
    Patreons:<br><br>
    <a href="https://github.com/krzemienski">Nick Krzemienski (USA)</a><br>
    <a href="https://vk.com/anaumynaugames">Ivan Chayka (Russia)</a><br>
    <a href="http://konkor.github.io/cpufreq/sponsors/">Phenix Nunlee</a><br>
    <a href="http://konkor.github.io/cpufreq/sponsors/">Steffen W. (Germany)</a><br>
    <a href="http://konkor.github.io/cpufreq/sponsors/">Yoann Deferi (France)</a><br>
    <br>
    <a href="https://konkor.github.io/cpufreq/supporters/">More wonderful people...</a><br>
    <br>
    <i>The one top will be placed in UI like 'Sponsored by ...' you could be here with your name or logo and reference (contact me or put links in donation's messages)</i>
  </big>
</p>

<!--special end-->
# [Project website](https://konkor.github.io/cpufreq/)
## Introduction
CPUFreq is a lightweight CPU scaling monitor and powerful CPU management tool. The extension is using standard cpufreq kernel modules to collect information and manage governors. It needs root permission to able changing governors.

https://extensions.gnome.org/extension/1082/cpufreq/

![SCREENSHOT](https://i.imgur.com/3oLzUUy.png)

## Features
* Compatible with many hardware architectures (x86, x64, arm ...);
* CPU Frequency monitoring;
* CPU Governor management;
* CPU Frequency speed limits;
* CPU Boost supporting;
* CPU Power on/off supporting;
* Saving/Restoring settings;
* User Profiles;
* More.

## Planned Features
* Dedicated GTK3+ application to cover all DE.
* Enhance functionality.
* Integrate CI and project management.
* Improve supporting and documentation.

## A Few Reasons Why You Should Not Want To Use Single Core For _Powersaving mode_:
* Modern OS/kernel works better on multi-core architectures.
* You need at least 1 core for a foreground application and 1 for the background system services.
* Linux Kernel is changing CPU cores to avoid overheating, thermal throttle and to balance system loading.
* Many CPUs have enabled Hyper-Threading (HT) technology. So there is no big sense to run 0.5 physical CPU core.
* ...

## Installation

- [See more about compilation and installation...](/INSTALL.md)
- [The project's documentation pages](http://konkor.github.io/cpufreq/install/)

## Donations
 I like completely open-source projects. It's why I picked GPLv3 license for my open projects. I think only such license could protect Desktop Users from Business Users. Maybe I'm a dreamer and want to believe in the pure projects but the reality is most projects and FOS organizations are sponsored by big business and founded by them.
 But real life is a hard thing and very complicated by many circumstances. I'm not young and all we have it's our life (time) and where we'll be tomorrow. Life is hard. I'd like it to work on my projects productively which want a lot of time and affords. Now I want get your support to have ability to support and develop projects.

- [Become a backer or sponsor on Patreon](https://www.patreon.com/konkor).
- One-time donation via [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JGFPHFHXMER6L) or Patreon where you can choose a custom pledge.

## Contribution

 Sure I will always consider your contribution of time for reports, requests, translations as a big deal.

Thank you to all the people who already contributed to the project!

See https://github.com/konkor/cpufreq/graphs/contributors

## License

[GPLv3](https://www.gnu.org/licenses/gpl.html)
