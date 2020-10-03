/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const SideMenu = imports.common.ui.SideMenu;
const ProfileItems = imports.common.ui.ProfileItems;
const Slider = imports.common.ui.Slider;
const Switch = imports.common.ui.Switch;
const MainWindow = imports.common.ui.MainWindow;

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
    if (cpu.default_profile) this.add_profiles ();
    this.add_governors ();
    if (cpu.pstate_present) this.pstate_build ();
    else this.acpi_build ();
    if (cpu.cpucount > 1) this.add_cores ();
    if (cpu.boost_present) this.add_boost ();

    this.save = Gtk.CheckButton.new_with_label (_("Remember settings"));
    this.save.tooltip_text = _("Check to restore settings on the startup");
    this.save.active = settings.save;
    this.save.margin = 18;
    this.save.opacity = 0.85;
    this.add_item (this.save);
    this.save.connect ('toggled', () => {
      if (!this.locked) settings.save = this.save.active;
    });
  },

  add_profiles: function () {
    let mi;
    this.profmenu =  new SideMenu.SideSubmenu (cpu.default_profile.name, _("Power Profile"), "");
    this.add_submenu (this.profmenu);

    mi = new SideMenu.SideItem (_("Balanced"), _("Optimal settings for the daily usage\n") +
      this.profile_tooltip (cpu.get_balanced_profile ()));
    this.profmenu.add_item (mi);
    mi.connect ('clicked', () => {
      settings.power_profile ("balanced");
    });

    mi = new SideMenu.SideItem (_("High Performance"), _("High responsive settings for high performance\n") +
      this.profile_tooltip (cpu.get_performance_profile ()));
    this.profmenu.add_item (mi);
    mi.connect ('clicked', () => {
      settings.power_profile ("performance");
    });

    mi = new SideMenu.SideItem (_("Power Saving"), _("Power saver and long battery life\n") +
      this.profile_tooltip (cpu.get_battery_profile ()));
    this.profmenu.add_item (mi);
    mi.connect ('clicked', () => {
      settings.power_profile ("battery");
    });

    mi = new SideMenu.SideItem (cpu.default_profile.name, _("Reset to default system settings\n") +
      this.profile_tooltip (cpu.default_profile));
    mi.margin_top = mi.margin_bottom = 8;
    this.profmenu.add_item (mi);
    mi.connect ('clicked', () => {
      settings.power_profile ("system");
    });

    for (let p in settings.profiles) {
      this.add_profile (p);
    }

    mi = new ProfileItems.NewProfileItem (_("New Profile..."), _("Create a profile from current settings"), _("Profile Name"));
    mi.margin_top = 8;
    this.profmenu.add_item (mi);
    mi.connect ('clicked', (o) => {
      settings.add_profile (cpu.get_profile (o.text));
      this.add_profile (settings.profiles.length - 1);
      this.profmenu.section.reorder_child (o, -1);
    });
  },

  add_profile: function (index) {
    let prf = new ProfileItems.ProfileItem (settings.profiles[index].name);
    prf.tooltip_text = this.profile_tooltip (settings.profiles[index]);
    prf.ID = parseInt (index);
    this.profmenu.add_item (prf);

    prf.connect ('clicked', (o) => {
      settings.power_profile (settings.profiles[o.ID].guid);
    });
    prf.connect ('edit', (o) => {
      if (this.edit_item && this.edit_item.edit_mode && this.edit_item.ID != o.ID) this.edit_item.toggle ();
      this.edit_item = o;
    });
    prf.connect ('edited', (o) => {
      settings.update_profile (o.ID, cpu.get_profile (o.text));
    });

    prf.connect ('delete', (o) => {
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
    });

    prf.show_all ();
  },

  profile_tooltip: function (p) {
    let s = "", g, a = 0, b = 100, f;
    if (!p) return s;
    if (p.cpu) s += p.cpu + " cores ";
    g = p.core[0].g;
    if (p.acpi) {
      a = p.core[0].a; b = p.core[0].b;
    } else {
      a = p.minf; b = p.maxf;
    }
    for (let i = 1; i < p.cpu; i++) {
      if (p.core[i].g != g) g = "mix";
      if (!p.acpi) continue;
      if (p.core[i].a < a) a = p.core[i].a;
      if (p.core[i].b > b) b = p.core[i].b;
      if (p.core[i].f) f = p.core[i].f;
    }
    if (g == "userspace" && f) s += "userspace " + get_label (f) + " ";
    else {
      if (g == "mix") s += "mixed governors ";
      else s += g + " governor ";
       s += get_label (a, 1) + " / " + get_label (b, 1) + " ";
    }
    if (p.turbo) s += "turbo";
    return s.trim ();
  },

  add_governors: function () {
    this.activeg = new SideMenu.SideSubmenu ("Governors", "Governor", "");
    var mixed = cpu.is_mixed_governors ();
    if (mixed) this.activeg.label = "Mixed";
    else if (cpu.governoractual.length)
      this.activeg.label = cpu.governoractual[0][0].toUpperCase() + cpu.governoractual[0].substring(1);
    cpu.governors.forEach (g => {
      if (g == "userspace") {
        this.userspace = new SideMenu.SideSubmenu ("Userspace", "Frequency", "Fixed Frequency");
        cpu.frequencies.forEach ((freq)=>{
          var s = "";
          if (freq.length > 6) {
            s = (parseInt(freq)/1000000).toFixed(3).toString() + " GHz";
          } else {
            s = (parseInt(freq)/1000).toFixed(0).toString() + " MHz";
          }
          let u_item = new SideMenu.SideItem (s);
          this.userspace.add_item (u_item);
          u_item.connect ("clicked", () => {
            if (!cpu.installed || this.locked) return;
            //this._changed ();
            settings.set_userspace (freq);
            this.activeg.label = "Userspace";
            this.userspace.expanded = false;
            this.check_sliders ();
          });
        });
      } else {
        let gi = new SideMenu.SideItem (g[0].toUpperCase() + g.substring(1), g + " governor");
        this.activeg.add_item (gi);
        gi.connect ('clicked', this.on_governor.bind (this));
      }
    });
    this.add_submenu (this.activeg);
    if (this.userspace  && (cpu.frequencies.length > 0)) this.add_submenu (this.userspace);
  },

  on_governor: function (o) {
    if (!cpu.installed || this.locked) return;
    this._changed ();
    settings.governor = o.label;
    this.activeg.label = o.label;
    this.activeg.expanded = false;
    this.check_sliders ();
  },

  check_sliders: function () {
    if (this.slider_min) {
      this.slider_max.slider.set_value (1);
      this.slider_min.slider.set_value (0);
    }
    if (cpu.pstate_present) {
      if (this.boost) {
        settings.turbo = this.boost.active;
      }
    } else if (this.slider_min) {
      this.slider_min.sensitive = true;
      this.slider_max.sensitive = true;
      if (this.activeg.label.indexOf ("Powersave") > -1) {
        this.slider_max.sensitive = false;
      } else if (this.activeg.label.indexOf ("Performance") > -1) {
        this.slider_min.sensitive = false;
      }
    }
  },

  acpi_build: function () {
    if (cpu.frequencies.length > 1) {
      this.sliders_build ();
      if (this.activeg.label.indexOf ("Powersave") > -1) {
        this.slider_max.sensitive = false;
      } else if (this.activeg.label.indexOf ("Performance") > -1) {
        this.slider_min.sensitive = false;
      }
    }
  },

  sliders_build: function () {
    this.add_item (new Gtk.Separator ({margin:10}));
    this.slider_min = new Slider.Slider ("Minimum", get_min_label (), "Minimum frequency");
    this.add_item (this.slider_min);
    this.slider_max = new Slider.Slider ("Maximum", get_max_label (), "Maximum frequency");
    this.add_item (this.slider_max);
    if (cpu.pstate_present) {
      this.slider_min.slider.set_value (cpu.minfreq/100);
      this.slider_max.slider.set_value (cpu.maxfreq/100);
    } else {
      this.slider_min.slider.set_value (cpu.get_pos (cpu.minfreq));
      this.slider_max.slider.set_value (cpu.get_pos (cpu.maxfreq));
    }
    this.slider_min.slider.connect ('value_changed', (item) => {
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
    });
    this.slider_max.slider.connect ('value_changed', (item) => {
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
    });
  },

  set_frequencies: function () {
    if (freq_event != 0) {
      GLib.source_remove (freq_event);
      freq_event = 0;
    }
    settings.set_frequencies ();
  },

  pstate_build: function () {
    this.sliders_build ();
  },

  add_cores: function () {
    this.slider_core = new Slider.Slider ("Cores Online",
      GLib.get_num_processors (), "Number of active processor cores");
    this.add_item (this.slider_core);
    this.slider_core.slider.set_value (GLib.get_num_processors () / cpu.cpucount);
    this.corewarn = new SideMenu.SideItem ("⚠ Single Core Thread","Single core is not recommended");
    this.corewarn.get_style_context ().add_class ("warn");
    this.corewarn.halign = 3;
    this.add_item (this.corewarn);
    this.corewarn.connect ('clicked', () => {
      let app = Gio.AppInfo.get_default_for_type ("text/plain", false);
      app.launch_uris (["file://" + APPDIR + "/README.md"], null);
    });
    this.slider_core.slider.connect ('value_changed', (item) => {
      if (!cpu.installed || this.locked) return;
      this._changed ();
      var cc = Math.floor ((cpu.cpucount - 1) * item.get_value() + 1);
      settings.set_cores (cc, () => {
        cpu.get_governors ();
        if (cpu.is_mixed_governors ()) this.activeg.label = "Mixed";
        else this.activeg.label = cpu.governoractual[0][0].toUpperCase() + cpu.governoractual[0].substring(1);
      });
      this.slider_core.update_info (cc);
      this.corewarn.visible = cc == 1;
    });
  },

  add_boost: function () {
    this.boost = new Switch.Switch ("Frequency Boost", cpu.get_turbo(), "Enable processor boosting technology");
    this.add_item (this.boost);
    this.boost.sw.connect ('state_set', () => {
      if (!cpu.installed || this.locked) return;
      this._changed ();
      settings.turbo = this.boost.active;
    });
  },

  _changed: function () {
    settings.guid = settings.user_profile.guid;
    if (this.profmenu) this.profmenu.label = _("Custom user settings");
  },

  update: function (profile_name) {
    this.locked = true;
    cpu.get_governors ();
    cpu.get_frequencies ();
    if (cpu.is_mixed_governors ()) this.activeg.label = "Mixed";
    else this.activeg.label = cpu.governoractual[0][0].toUpperCase() + cpu.governoractual[0].substring(1);
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
    if (this.profmenu && profile_name) this.profmenu.label = profile_name;
    this.save.active = settings.save;
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
