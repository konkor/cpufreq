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

const DEBUG_LVL = 2;

let window = null;

var CPUFreqApplication = new Lang.Class ({
  Name: "CPUFreqApplication",
  Extends: Gtk.Application,

  _init: function (args) {
    GLib.set_prgname ("cpufreq-application");
    this.parent ({
      application_id: "org.konkor.cpufreq.application"
    });
    GLib.set_application_name ("CPUFreq Manager");

    Logger.init (DEBUG_LVL);
    this.extension = false;

    this.connect ('handle-local-options', (o) => {
      let s, prf = false;
      for (let i = 0; i < args.length; i++) {
        var s = args[i];
        if ((s == "-h") || (s == "--help")) {
            print ("cpufreq-application [[OPTION] [PARAMETERS]]\n" +
            " --help         : Show this screen\n" +
            " --debug        : Enable debugging messages\n" +
            " --extension    : Extension mode\n" +
            " --profile GUID : Load power profile by GUID\n");
            return 0; //success
        } else if (s == "--extension") {
          this.extension = true;
        } else if (s == "--debug") {
          Logger.init (2);
        } else if (s == "--profile") {
          prf = true;
        } else if (prf) {
          guid = s;
          prf = false;
        }
      }
      return -1; //continue
    });
  },

  vfunc_startup: function() {
    this.parent();
    this.settings = new Settings.Settings ();
    cpu.init (this.settings);
  },

  vfunc_activate: function() {
    print ("activate");
    if (!this.active_window) {
      window = new MainWindow.MainWindow ({ application:this });
      window.connect ("destroy", () => {
        return true;
      });
      window.show_all ();
      cpu.profile_changed_callback = Lang.bind (this, this.on_profile_changed);
      if (this.settings.save) cpu.restore_saved ();
      window.cpanel.post_init ();
    }
    this.active_window.present ();
  },

  on_profile_changed: function (profile) {
    if (!this.active_window) return;
    this.active_window.cpanel.update (profile.name);
  },

  get cpufreq () {
    return cpu;
  }
});
