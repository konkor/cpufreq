/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2018 konkor <github.com/konkor>
 *
 * This file is part of CPUFreq Manager.
 *
 * CPUFreq Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CPUFreq Manager is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

imports.searchPath.unshift(getCurrentFile ()[1]);
const Submenu = imports.ui.Submenu;
const MenuItem = imports.ui.MenuItem;
const Slider = imports.ui.Slider;
const Switch = imports.ui.Switch;

var cpu = null;
var settings = null;

let freq_event = 0;

var ControlPanel = new Lang.Class({
  Name: "ControlPanel",
  Extends: Gtk.Box,

  _init: function (owner) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    this.app = owner;
    cpu = this.app.cpufreq;
    settings = this.app.settings;
    print (cpu.cpucount);
    print (cpu.governors);

    this.add_governors ();
    if (cpu.pstate_present) this.pstate_build ();
    else this.acpi_build ();
    if (cpu.cpucount > 1) this.add_cores ();
    if (cpu.boost_present) this.add_boost ();

    //this.show_all ();
  },

  post_init: function () {
    if (cpu.cpucount > 1)
      this.corewarn.visible = GLib.get_num_processors () == 1;
  },

  add_governors: function () {
    this.activeg = new Submenu.Submenu ("Governors", "Active Governor", 0);
    //this.pack_start (this.activeg, true, true, 0);
    this.activeg.connect ("activate", Lang.bind (this, this.on_submenu));
    cpu.governors.forEach (g => {
      if (g[1] == true) this.activeg.set_label (g[0]);
      if (g[0] == "userspace") {
        this.userspace = new Submenu.Submenu ("userspace", "Userspace Governor", 1);
        this.userspace.connect ("activate", Lang.bind (this, this.on_submenu));
        cpu.frequences.forEach ((freq)=>{
          var s = "";
          if (freq.length > 6) {
            s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
          } else {
            s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
          }
          let u_item = new MenuItem.MenuItem (s);
          this.userspace.add_menuitem (u_item);
          u_item.connect ("clicked", Lang.bind (this, function () {
            if (!cpu.installed) return;
            this._changed ();
            cpu.set_userspace (freq);
            this.activeg.set_label ("userspace");
            this.userspace.expanded = false;
            this.check_sliders ();
          }));
        });
      } else {
        let gi = new MenuItem.MenuItem (g[0], g[0] + " governor");
        this.activeg.add_menuitem (gi);
        gi.connect ('clicked', Lang.bind (this, this.on_governor));
      }
    });
    this.add (this.activeg);
    if (this.userspace  && (cpu.frequences.length > 0)) this.add (this.userspace);
  },

  on_submenu: function (o) {
    if (o.id == 0) {
      if (this.userspace) this.userspace.expanded = false;
    } else this.activeg.expanded = false;
  },

  on_governor: function (o) {
    if (!cpu.installed) return;
    this._changed ();
    cpu.set_governor (o.label);
    this.activeg.set_label (o.label);
    this.activeg.expanded = false;
    this.check_sliders ();
  },

  check_sliders: function () {
    if (cpu.pstate_present) {
      this.slider_min.slider.set_value (cpu.get_min_pstate() / 100);
      this.slider_max.slider.set_value (cpu.get_max_pstate() / 100);
    } else if (this.slider_min) {
      this.slider_min.sensitive = true;
      this.slider_max.sensitive = true;
      if (this.activeg.label.indexOf ("powersave") > -1) {
        this.slider_min.slider.set_value (0);
        this.slider_max.sensitive = false;
      } else if (this.activeg.label.indexOf ("performance") > -1) {
        this.slider_max.slider.set_value (1);
        this.slider_min.sensitive = false;
      }
    }
  },

  acpi_build: function () {
    if (cpu.frequences.length > 1) {
      this.sliders_build ();
      if (this.activeg.label.indexOf ("powersave") > -1) {
        this.slider_max.sensitive = false;
        debug (this.activeg.label);
      } else if (this.activeg.label.indexOf ("performance") > -1) {
        this.slider_min.sensitive = false;
      }
    }
  },

  sliders_build: function () {
    this.add (new Gtk.Separator ());
    this.slider_min = new Slider.Slider ("Minimum", get_min_label (), "Minimum Frequency");
    this.add (this.slider_min);
    this.slider_max = new Slider.Slider ("Maximum", get_max_label (), "Maximum Frequency");
    this.add (this.slider_max);
    if (cpu.pstate_present) {
      this.slider_min.slider.set_value (cpu.minfreq/100);
      this.slider_max.slider.set_value (cpu.maxfreq/100);
    } else {
      this.slider_min.slider.set_value (cpu.get_pos (cpu.minfreq));
      this.slider_max.slider.set_value (cpu.get_pos (cpu.maxfreq));
    }
    this.slider_min.slider.connect('value_changed', Lang.bind (this, function (item) {
      if (!cpu.installed) return;
      this._changed ();
      if (item.get_value() > this.slider_max.slider.get_value()) {
        this.slider_max.slider.set_value (item.get_value ());
      }
      if (cpu.pstate_present) cpu.minfreq = Math.floor (item.get_value() * 100);
      else cpu.minfreq = cpu.get_freq (Math.floor (item.get_value() * 100));
      this.slider_min.update_info (get_label (cpu.minfreq));
      if (freq_event != 0)
        GLib.source_remove (freq_event);
      freq_event = GLib.timeout_add (0, 1000, this.set_frequencies);
    }));
    this.slider_max.slider.connect('value_changed', Lang.bind (this, function (item) {
      if (!cpu.installed) return;
      this._changed ();
      if (item.get_value() < this.slider_min.slider.get_value()) {
        this.slider_min.slider.set_value (item.get_value ());
      }
      if (cpu.pstate_present) cpu.maxfreq = Math.floor (item.get_value() * 100);
      else cpu.maxfreq = cpu.get_freq (Math.floor (item.get_value() * 100));
      this.slider_max.update_info (get_label (cpu.maxfreq));
      if (freq_event != 0)
        GLib.source_remove (freq_event);
      freq_event = GLib.timeout_add (0, 1000, this.set_frequencies);
    }));
  },

  set_frequencies: function () {
    if (freq_event != 0) {
      GLib.source_remove (freq_event);
      freq_event = 0;
    }
    cpu.set_frequencies ();
  },

  pstate_build: function () {
    this.sliders_build ();
  },

  add_cores: function () {
    this.slider_core = new Slider.Slider ("Cores Online",
      GLib.get_num_processors (), "Number Of Active Core Threads");
    this.add (this.slider_core);
    this.slider_core.slider.set_value (GLib.get_num_processors () / cpu.cpucount);
    this.corewarn = new MenuItem.MenuItem ("⚠ Single Core Thread","Single Core Thread Is Not Recommended");
    this.corewarn.get_style_context ().add_class ("warn");
    this.corewarn.xalign = 0.5;
    this.add (this.corewarn);
    this.corewarn.connect ('clicked', Lang.bind (this, function () {
      let app = Gio.AppInfo.get_default_for_type ("text/plain", false);
      app.launch_uris (["file://" + APPDIR + "/README.md"], null);
    }));
    this.slider_core.slider.connect('value_changed', Lang.bind (this, function (item) {
      if (!cpu.installed) return;
      this._changed ();
      var cc = Math.floor ((cpu.cpucount - 1) * item.get_value() + 1);
      cpu.set_cores (cc);
      this.slider_core.update_info (cc);
      this.corewarn.visible = cc == 1;
    }));
  },

  add_boost: function () {
    this.boost = new Switch.Switch ("Turbo Boost", cpu.get_turbo(), "Enable/Disable Processor Boost");
    this.add (this.boost);
    this.boost.sw.connect ('state_set', Lang.bind (this, function () {
      this._changed ();
      if (cpu.installed) cpu.set_turbo (this.boost.sw.active);
    }));
  },

  _changed: function () {
    if (settings.PID > -1) {
      settings.PID = -1;
    }
    if (this.profmenu) this.profmenu.label = "Custom";
  }
});

function get_label (num, n) {
    if (cpu.pstate_present) return num + "%";
    n = (typeof n !== 'undefined') ?  n : 3;
    if (num >= 1000000) {
        return (num/1000000).toFixed(n).toString() + " \u3393";
    } else {
        return (num/1000).toFixed(0).toString() + " \u3392";
    }
}

function get_min_label (n) {
    n = (typeof n !== 'undefined') ?  n : 3;
    if (cpu.pstate_present) return cpu.minfreq + "%";
    return get_label (cpu.get_min (), n);
}

function get_max_label (n) {
    n = (typeof n !== 'undefined') ?  n : 3;
    if (cpu.pstate_present) return cpu.maxfreq + "%";
    return get_label (cpu.get_max (), n);
}

function getCurrentFile () {
  let stack = (new Error()).stack;
  let stackLine = stack.split("\n")[1];
  if (!stackLine)
    throw new Error ("Could not find current file");
  let match = new RegExp ("@(.+):\\d+").exec(stackLine);
  if (!match)
    throw new Error ("Could not find current file");
  let path = match[1];
  let file = Gio.File.new_for_path (path).get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
