/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

imports.gi.versions.Gtk = '3.0';

let d = new Date ();
print ("\x1b[00;32m[" + d.toString().substring (0, d.toString().indexOf (" GMT")) + "." + (d.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
  "](DD) [cpufreq][application]\x1b[0m Starting application");

const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const Convenience = imports.convenience;
const cpu = imports.common.HelperCPUFreq;
const Settings = imports.common.Settings;
const Logger = imports.common.Logger;
const MainWindow = imports.common.ui.MainWindow;

var DEBUG_LVL = 0;

let window = null;

var CPUFreqApplication = new Lang.Class ({
  Name: "CPUFreqApplication",
  Extends: Gtk.Application,

  _init: function (props={}) {
    GLib.set_prgname ("cpufreq-application");
    this.parent (props);
    GLib.set_application_name ("CPUFreq Manager");
    Logger.init (DEBUG_LVL);
    this.save = true;
    this.extension = false;

    this.add_main_option (
      'debug', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable debugging messages", null
    );
    this.add_main_option (
      'verbose', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable verbose output", null
    );
    this.add_main_option (
      'extension', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Enable extension mode", null
    );
    this.add_main_option (
      'no-save', 0, GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
      "Do not remember applying profile", null
    );
    this.add_main_option (
      'profile', 0, GLib.OptionFlags.NONE, GLib.OptionArg.STRING,
      "Enable power profile battery|balanced|performance|system|user|GUID", "GUID"
    );
    this.connect ('handle-local-options', this.on_local_options.bind (this));
  },

  on_local_options: function (app, options) {
    try {
      this.register (null);
    } catch (e) {
      Logger.error ("Failed to register: %s".format (e.message));
      return 1;
    }

    if (options.contains ("verbose")) {
      DEBUG_LVL = 1; //Enable info messages
      Logger.init (1);
    }
    if (options.contains ("debug")) {
      DEBUG_LVL = 2;
      Logger.init (2);
    }
    if (options.contains ("extension")) {
      this.extension = true;
    }
    if (options.contains ("no-save")) {
      this.save = false;
    }
    if (options.contains ("profile")) {
      let v = options.lookup_value ("profile", null);
      if (v) [v, ] = v.get_string ();
      this.process_profile (v);
      Logger.debug ("finishing loading profile: \`%s\`".format (v));
      //TODO: fix https://gitlab.gnome.org/GNOME/gjs/issues/232
      return 0;
    }

    Logger.debug ("verbose:%s debug:%s extension:%s".format (DEBUG_LVL>0, DEBUG_LVL>1, this.extension));
    return -1;
  },

  vfunc_startup: function () {
    Logger.info ("startup");
    this.parent();
    this.initialize ();

    /*this.connect ('open', Lang.bind (this, (files) => {
      print ("open", files.map(function(f) { return f.get_uri(); }));
    }));*/
  },

  initialize: function () {
    if (this.settings) return;
    Logger.info ("initialization ...");
    this.settings = new Settings.Settings ();
    Logger.info ("Settings creatad.");
    cpu.init (this.settings);
    Logger.info ("CPUFreq initialized.");
  },

  vfunc_activate: function () {
    Logger.info ("activating ... " + !this.finishing);
    if (this.finishing) return;
    if (!this.active_window) {
      window = new MainWindow.MainWindow ({ application:this });
      Logger.info ("created MainWindow");
      window.connect ("destroy", () => {
        return true;
      });
      window.show_all ();
      cpu.profile_changed_callback = Lang.bind (this, this.on_profile_changed);
      Logger.info ("restoring saved " + this.settings.save);
      if (this.settings.save) cpu.restore_saved ();
      Logger.info ("post_init " + !!window.cpanel);
      if (window.cpanel) window.cpanel.post_init ();
      else this.quit ();
      window.connect ("realize", () => {
        Logger.info ("realize");
      });
    } else {
      if (this.extension) {
        if (this.active_window) this.active_window.save_geometry ();
        this.quit ();
      } else if (this.active_window.cpanel) GLib.timeout_add_seconds (0, 2, () => {
        this.active_window.update ();
        this.active_window.present ();
      });
    }
  },

  on_profile_changed: function (profile) {
    if (!this.active_window || !this.active_window.cpanel) return;
    this.active_window.cpanel.update (profile.name);
  },

  process_profile: function (id) {
    if (!id) {
      this.finishing = true;
      Logger.error ("No profile GUID specified...");
      return 1;
    }
    this.initialize ();
    this.finishing = true;
    this.hold ();
    cpu.profile_changed_callback = this.quit_cb.bind (this);
    cpu.power_profile (id, this.save);
    return 0;
  },

  quit_cb: function (profile) {
    this.release ();
  },

  get cpufreq () {
    return cpu;
  }
});
