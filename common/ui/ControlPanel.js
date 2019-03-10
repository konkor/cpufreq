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

const SideMenu = imports.common.ui.SideMenu;
const ProfileItems = imports.common.ui.ProfileItems;
const Slider = imports.common.ui.Slider;
const Switch = imports.common.ui.Switch;

const Gettext = imports.gettext.domain ('org-konkor-cpufreq');
const _ = Gettext.gettext;

var cpu = null;
var settings = null;

let freq_event = 0;

//TODO: Responsive look
var ControlPanelBoxed = new Lang.Class({
  Name: "ControlPanelBoxed",
  Extends: Gtk.Box,

  _init: function (owner) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL});

    //let space = new Gtk.Box ();
    //this.pack_start (space, true, false, 0);

    this.panel = new ControlPanel (owner);
    this.pack_start (this.panel, true, true, 0);

    let space = new Gtk.Box ();
    this.pack_start (space, true, false, 0);
  },

  post_init: function () {
    this.panel.post_init ();
  }

});

var ControlPanel = new Lang.Class({
  Name: "ControlPanel",
  Extends: SideMenu.SideMenu,

  _init: function (owner) {
    this.parent ();
    this.app = owner;
    cpu = this.app.cpufreq;
    settings = this.app.settings;
    this.locked = false;

    this.build ();
  },

  post_init: function () {
    if (cpu.cpucount > 1)
      this.corewarn.visible = GLib.get_num_processors () == 1;
  },

  build: function () {
    this.add_governors ();
    if (cpu.pstate_present) this.pstate_build ();
    else this.acpi_build ();
    if (cpu.cpucount > 1) this.add_cores ();
    if (cpu.boost_present) this.add_boost ();
    this.add_profiles ();

    this.save = Gtk.CheckButton.new_with_label (_("Remember settings"));
    this.save.tooltip_text = _("Check to restore settings on the startup");
    this.save.active = settings.save;
    this.save.margin = 18;
    this.save.opacity = 0.85;
    this.add_item (this.save);
    this.save.connect ('toggled', Lang.bind (this, ()=>{
        settings.save = this.save.active;
    }));
  },

  add_profiles: function () {
    let mi;
    this.profmenu =  new SideMenu.SideSubmenu (cpu.default_profile.name, _("Profiles Menu"));
    this.add_submenu (this.profmenu);

    mi = new ProfileItems.NewProfileItem (_("New..."), _("Create a profile from current settings"), _("Profile Name"));
    this.profmenu.add_item (mi);
    mi.connect ('clicked', Lang.bind (this, (o) => {
      print ("New Item", o.text);
      settings.add_profile (cpu.get_profile (o.text));
      this.add_profile (settings.profiles.length - 1);
    }));

    mi = new SideMenu.SideItem (cpu.default_profile.name, _("Load default system settings"));
    this.profmenu.add_item (mi);
    mi.connect ('clicked', Lang.bind (this, () => {
      cpu.reset_defaults ();
    }));

    for (let p in settings.profiles) {
      this.add_profile (p);
    }
  },

  add_profile: function (index) {
    let prf = new ProfileItems.ProfileItem (settings.profiles[index].name);
    prf.ID = parseInt (index);
    this.profmenu.add_item (prf);

    prf.connect ('clicked', Lang.bind (this, function (o) {
      cpu.load_profile (settings.profiles[o.ID]);
      settings.PID = o.ID;
    }));

    prf.connect ('edited', Lang.bind (this, function (o) {
      settings.update_profile (o.ID, cpu.get_profile (o.text));
    }));

    prf.connect ('delete', Lang.bind (this, function (o) {
      var id = parseInt (o.ID);
      settings.delete_profile (id);
      o.destroy ();
      id += 1;
      let i = 0;
      this.profmenu.section.get_children ().forEach ((p) => {
        if (i > id) {
          p.ID -= 1;
        }
        i++;
      });
    }));

    prf.show_all ();
  },

  add_governors: function () {
    this.activeg = new SideMenu.SideSubmenu ("Governors", "Active Governor");
    var mixed = cpu.is_mixed_governors ();
    if (mixed) this.activeg.label = "mixed";
    cpu.governors.forEach (g => {
      if ((g[1] == true) && !mixed) this.activeg.label = g[0];
      if (g[0] == "userspace") {
        this.userspace = new SideMenu.SideSubmenu ("userspace", "Userspace Governor");
        cpu.frequencies.forEach ((freq)=>{
          var s = "";
          if (freq.length > 6) {
            s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
          } else {
            s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
          }
          let u_item = new SideMenu.SideItem (s);
          this.userspace.add_item (u_item);
          u_item.connect ("clicked", Lang.bind (this, function () {
            if (!cpu.installed || this.locked) return;
            this._changed ();
            cpu.set_userspace (freq);
            this.activeg.label = "userspace";
            this.userspace.expanded = false;
            this.check_sliders ();
          }));
        });
      } else {
        let gi = new SideMenu.SideItem (g[0], g[0] + " governor");
        this.activeg.add_item (gi);
        gi.connect ('clicked', Lang.bind (this, this.on_governor));
      }
    });
    this.add_submenu (this.activeg);
    //this.pack_start (this.activeg, true, true, 0);
    if (this.userspace  && (cpu.frequencies.length > 0)) this.add_submenu (this.userspace);
    //  this.pack_start (this.userspace, true, true, 0);
  },

  on_governor: function (o) {
    if (!cpu.installed || this.locked) return;
    this._changed ();
    cpu.set_governors (o.label);
    this.activeg.label = o.label;
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
    if (cpu.frequencies.length > 1) {
      this.sliders_build ();
      if (this.activeg.label.indexOf ("powersave") > -1) {
        this.slider_max.sensitive = false;
        //debug (this.activeg.label);
      } else if (this.activeg.label.indexOf ("performance") > -1) {
        this.slider_min.sensitive = false;
      }
    }
  },

  sliders_build: function () {
    this.add_item (new Gtk.Separator ());
    this.slider_min = new Slider.Slider ("Minimum", get_min_label (), "Minimum Frequency");
    this.add_item (this.slider_min);
    this.slider_max = new Slider.Slider ("Maximum", get_max_label (), "Maximum Frequency");
    this.add_item (this.slider_max);
    if (cpu.pstate_present) {
      this.slider_min.slider.set_value (cpu.minfreq/100);
      this.slider_max.slider.set_value (cpu.maxfreq/100);
    } else {
      this.slider_min.slider.set_value (cpu.get_pos (cpu.minfreq));
      this.slider_max.slider.set_value (cpu.get_pos (cpu.maxfreq));
    }
    this.slider_min.slider.connect('value_changed', Lang.bind (this, function (item) {
      if (!cpu.installed || this.locked) return;
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
      if (!cpu.installed || this.locked) return;
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
    this.add_item (this.slider_core);
    this.slider_core.slider.set_value (GLib.get_num_processors () / cpu.cpucount);
    this.corewarn = new SideMenu.SideItem ("⚠ Single Core Thread","Single Core Thread Is Not Recommended");
    this.corewarn.get_style_context ().add_class ("warn");
    this.corewarn.xalign = 0.5;
    this.add_item (this.corewarn);
    this.corewarn.connect ('clicked', Lang.bind (this, function () {
      let app = Gio.AppInfo.get_default_for_type ("text/plain", false);
      app.launch_uris (["file://" + APPDIR + "/README.md"], null);
    }));
    this.slider_core.slider.connect('value_changed', Lang.bind (this, function (item) {
      if (!cpu.installed || this.locked) return;
      this._changed ();
      var cc = Math.floor ((cpu.cpucount - 1) * item.get_value() + 1);
      cpu.set_cores (cc, () => {
        cpu.get_governors ();
        if (cpu.is_mixed_governors ()) this.activeg.label = "mixed";
        else this.activeg.label = cpu.governoractual[0];
      });
      this.slider_core.update_info (cc);
      this.corewarn.visible = cc == 1;
    }));
  },

  add_boost: function () {
    this.boost = new Switch.Switch ("Turbo Boost", cpu.get_turbo(), "Enable/Disable Processor Boost");
    this.add_item (this.boost);
    this.boost.sw.connect ('state_set', Lang.bind (this, function () {
      if (!cpu.installed || this.locked) return;
      this._changed ();
      cpu.set_turbo (this.boost.active);
    }));
  },

  _changed: function () {
    if (settings.PID > -1) {
      settings.PID = -1;
    }
    if (this.profmenu) this.profmenu.label = "Custom";
  },

  update: function (profile_name) {
    this.locked = true;
    cpu.get_governors ();
    cpu.get_frequencies ();
    if (cpu.is_mixed_governors ()) this.activeg.label = "mixed";
    else this.activeg.label = cpu.governoractual[0];
    this.check_sliders ();
    if (this.slider_min) {
      if (cpu.pstate_present) {
        this.slider_min.slider.set_value (cpu.minfreq/100);
        this.slider_max.slider.set_value (cpu.maxfreq/100);
      } else {
        this.slider_min.slider.set_value (cpu.get_pos (cpu.minfreq));
        this.slider_max.slider.set_value (cpu.get_pos (cpu.maxfreq));
      }
      this.slider_min.update_info (get_label (cpu.minfreq));
      this.slider_max.update_info (get_label (cpu.maxfreq));
    }
    if (this.boost)
      this.boost.active = cpu.get_turbo ();
    if (this.slider_core) {
      let cc = GLib.get_num_processors ();
      this.slider_core.slider.set_value (cc / cpu.cpucount);
      this.slider_core.update_info (cc);
      this.post_init ();
    }
    if (profile_name) this.profmenu.label = profile_name;
    this.locked = false;
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
