/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gdk = imports.gi.Gdk;

const SAVE_SETTINGS_KEY = 'save-settings';
const DARK_THEME_KEY = 'dark-theme';
const USER_PROFILE_KEY = 'user-profile';
const PROFILES_KEY = 'profiles';
const PROFILE_ID_KEY = 'profile-id';
const MONITOR_KEY = 'monitor';

let _save = true;
let _dark = false;
let _guid = "balanced";
let profiles = [];
let current = null;

let cpu = null;

var Settings = new Lang.Class({
  Name: "Settings",
  Extends: Gio.Settings,

  _init: function (cpufreq) {
    cpu = cpufreq;
    const schema = 'org.gnome.shell.extensions.cpufreq';
    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = Gio.File.new_for_path (getCurrentFile()[1] + '/schemas');
    let schemaSource;
    if (schemaDir.query_exists (null))
      schemaSource = GioSSS.new_from_directory (
        schemaDir.get_path (), GioSSS.get_default (), false
      );
    else
      schemaSource = GioSSS.get_default ();

    let schemaObj = schemaSource.lookup (schema, true);
    if (!schemaObj)
      throw new Error (
        'Schema ' + schema + ' could not be found for the extension. ' +
        'Please check your installation.'
      );
    this.parent ({ settings_schema: schemaObj });
    current = cpu.get_profile ("Saved settings", "user");
    this.load ();

    this.connect ("changed", this.on_settings.bind (this));
  },

  on_settings: function (o, key) {
    if (key == PROFILE_ID_KEY) {
      _guid =  o.get_string (PROFILE_ID_KEY);
    } else if (key == SAVE_SETTINGS_KEY) {
      _save = this.get_boolean (SAVE_SETTINGS_KEY);
    } else if (key == DARK_THEME_KEY) {
      _dark = this.get_boolean (DARK_THEME_KEY);
    }
  },

  load: function () {
    _save = this.get_boolean (SAVE_SETTINGS_KEY);
    _dark = this.get_boolean (DARK_THEME_KEY);
    _guid = this.get_string (PROFILE_ID_KEY);
    this.load_profiles ();
    let s = this.get_string (USER_PROFILE_KEY);
    if (s) current = JSON.parse (s);
  },

  get save () { return _save; },
  set save (val) {
    _save = val;
    this.set_boolean (SAVE_SETTINGS_KEY, _save);
  },

  get dark () { return _dark; },

  get user_profile () { return current; },
  set user_profile (val) {
    if (!val) return;
    current = val;
    this.update_user_profile ();
  },

  update_user_profile: function () {
    let s = JSON.stringify (current);
    this.set_string (USER_PROFILE_KEY, s);
  },

  get monitor () { return this.get_int (MONITOR_KEY); },
  set monitor (val) { this.set_int (MONITOR_KEY, val); },

  get guid () {
    return _guid;
  },
  set guid (val) {
    if (_guid == val) return;
    _guid = val;
    this.set_string (PROFILE_ID_KEY, _guid);
    let p = this.get_profile (val), cores = [];
    if (p) {
      p.core.forEach (c => {
        let core = {g:c.g,a:c.a,b:c.b};
        if (c.f) core.f = c.f;
        cores.push (core);
      });
      current = {
        name:current.name, minf:p.minf, maxf:p.maxf, turbo:p.turbo, cpu:p.cpu,
        acpi:current.acpi, guid:current.guid, core:cores
      };
      this.update_user_profile ();
    }
  },

  get profiles () { return profiles; },

  load_profiles: function () {
    let s = this.get_string (PROFILES_KEY);
    if (s) try {
      profiles = JSON.parse (s);
    } catch (e) {
      profiles = [];
    }
  },

  add_profile: function (profile) {
    profiles.push (profile);
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  get_profile: function (id) {
    let profile = null;
    if (profiles.length && id) profiles.forEach (p => {
      if (p.guid == id) profile = p;
    });
    return profile;
  },

  update_profile: function (index, profile) {
    if (index >= profiles.length) return;
    let p = profiles[index];
    if (!p || !profile) return;
    profile.guid = p.guid;
    profiles[index] = profile;
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  delete_profile: function (index) {
    if (index >= profiles.length) return;
    if (this.guid == profiles[index].guid) {
      this.guid = this.user_profile.guid;
    }
    profiles.splice (index, 1);
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  power_profile: function (id, save) {
    save = (typeof save !== 'undefined') ?  save : true;
    let prf = this.get_profile (id);
    if (id == "user") {
      this.restore_saved ();
      return;
    } else if (prf) cpu.set_power_profile (prf);
    else cpu.power_profile (id, save);
    if (save) {
      this.save = id != cpu.default_profile.guid;
      this.guid = id;
    }
  },

  restore_saved: function () {
    if (this.guid == this.user_profile.guid)
      cpu.set_power_profile (this.user_profile);
    else this.power_profile (this.guid);
  },

  get turbo () {
    if (current) return current.turbo;
    return true;
  },
  set turbo (val) {
    if (!current || (current.turbo == val)) return;
    cpu.set_turbo (val);
    current.turbo = val;
    if (this.save) this.update_user_profile ();
  },

  get cpu_cores () {
    if (current) return current.cpu;
    return 1;
  },
  set cpu_cores (val) {
    this.set_cores (val);
  },
  set_cores: function (val, callback) {
    if (!current || (current.cpu == val)) return;
    current.cpu = val;
    cpu.set_cores (val, callback);
    if (this.save) this.update_user_profile ();
  },

  get min_freq () {
    if (current && current.core[0])
      return current.core[0].a;
    return 0;
  },
  set min_freq (val) {
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].a != val) equal = false;
      current.core[i].a = val;
    }
    cpu.set_min (val);
    if (!equal && this.save) this.update_user_profile ();
  },

  get max_freq () {
    if (current && current.core[0])
      return current.core[0].b;
    return 0;
  },
  set max_freq (val) {
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].b != val) equal = false;
      current.core[i].b = val;
    }
    cpu.set_max (val);
    if (!equal && this.save) this.update_user_profile ();
  },

  get governor () {
    if (current && current.core[0])
      return current.core[0].g;
    return "";
  },
  set governor (val) {
    if (!current || !val) return;
    if (!cpu.camel) val = val.toLowerCase().trim();
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].g != val) equal = false;
      current.core[i].g = val;
    }
    cpu.set_governors (val);
    if (!equal && this.save) this.update_user_profile ();
  },

  get min_freq_pstate () {
    if (current)
      return current.minf;
    return 0;
  },
  set min_freq_pstate (val) {
    if (!current || (current.minf == val)) return;
    current.minf = val;
    cpu.set_min_pstate (val);
    if (this.save) this.update_user_profile ();
  },

  get max_freq_pstate () {
    if (current)
      return current.maxf;
    return 0;
  },
  set max_freq_pstate (val) {
    if (!current || (current.maxf == val)) return;
    current.maxf = val;
    cpu.set_max_pstate (val);
    if (this.save) this.update_user_profile ();
  },

  set_userspace: function (frequency) {
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].g != "userspace") equal = false;
      if (current.core[i].f != frequency) equal = false;
      current.core[i].g = "userspace";
      current.core[i].f = frequency;
    }
    cpu.set_userspace (frequency);
    if (!equal && this.save) this.update_user_profile ();
  },

  set_frequencies: function () {
    if (!cpu.set_frequencies ()) return;
    if (cpu.pstate_present) {
      current.minf = cpu.minfreq;
      current.maxf = cpu.maxfreq;
    } else {
      for (let i = 0; i < current.cpu; i++) {
        current.core[i].a = cpu.minfreq;
        current.core[i].b = cpu.maxfreq;
      }
    }
    if (this.save) this.update_user_profile ();
  },

  get window_height () { return this.get_int ("window-height"); },
  get window_width () { return this.get_int ("window-width"); },
  get window_x () { return this.get_int ("window-x"); },
  get window_y () { return this.get_int ("window-y"); },
  get window_maximized () { return this.get_boolean ("window-maximized"); },

  save_geometry: function (o) {
    let window = o.get_window ();
    if (!window) return;
    let ws = window.get_state();
    let x = 0, y = 0, w = 480, h = 720, maximized = false;

    if (Gdk.WindowState.MAXIMIZED & ws) {
      maximized = true;
    } else if ((Gdk.WindowState.TILED & ws) == 0) {
      [x, y] = window.get_position ();
      [w, h] = o.get_size ();
      this.set_int ("window-x", x);
      this.set_int ("window-y", y);
      this.set_int ("window-width", w);
      this.set_int ("window-height", h);
    }
    this.set_boolean ("window-maximized", maximized);
  }
});

function getCurrentFile () {
  let stack = (new Error()).stack;
  let stackLine = stack.split('\n')[1];
  if (!stackLine)
    throw new Error ('Could not find current file');
  let match = new RegExp ('@(.+):\\d+').exec(stackLine);
  if (!match)
    throw new Error ('Could not find current file');
  let path = match[1];
  let file = Gio.File.new_for_path (path).get_parent();
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
