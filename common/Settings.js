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

const SAVE_SETTINGS_KEY = 'save-settings';
const REMEMBERED_KEY = 'remember-profile';
const PROFILES_KEY = 'profiles';
const PROFILE_KEY = 'profile';
const MONITOR_KEY = 'monitor';

let _save = false;
let _PID = -1;
let profiles = [];
let current = null;

var Settings = new Lang.Class({
  Name: "Settings",
  Extends: Gio.Settings,

  _init: function () {
    const schema = 'org.gnome.shell.extensions.cpufreq';
    const GioSSS = Gio.SettingsSchemaSource;

    let schemaDir = Gio.File.new_for_path (getCurrentFile()[1] + '/schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
      schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                              GioSSS.get_default(),
                                              false);
    else
      schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
      throw new Error('Schema ' + schema + ' could not be found for the extension. ' +
                      'Please check your installation.');
    this.parent ({ settings_schema: schemaObj });
    this.load ();
  },

  load: function () {
    _save = this.get_boolean (SAVE_SETTINGS_KEY);
    _PID = this.get_int (PROFILE_KEY);
    this.load_profiles ();
    let s = this.get_string (REMEMBERED_KEY);
    if (s) current = JSON.parse (s);
  },

  get save () { return _save; },
  set save (val) {
    _save = val;
    this.set_boolean (SAVE_SETTINGS_KEY, _save);
  },

  get current_profile () { return current; },
  set current_profile (val) {
    if (!val) return;
    current = val;
    this.update_current_profile ();
  },

  update_current_profile: function () {
    let s = JSON.stringify (current);
    this.set_string (REMEMBERED_KEY, s);
    print ("Updating settings");
  },

  get monitor () { return this.get_int (MONITOR_KEY); },
  set monitor (val) { this.set_int (MONITOR_KEY, val); },

  get PID () {
    if (_PID >= profiles.length) this.PID = -1;
    return _PID;
  },
  set PID (val) {
    if (_PID == val) return;
    _PID = val;
    this.set_int (PROFILE_KEY, _PID);
    if (val > -1) {
      let p = profiles[val];
      current = {
        name:current.name, minf:p.minf, maxf:p.maxf, turbo:p.turbo, cpu:p.cpu,
        acpi:current.acpi, guid:current.guid, core:p.core
      };
      this.update_current_profile ();
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

  update_profile: function (id, profile) {
    let p = profiles[id];
    if (!p || !profile) return;
    profile.guid = p.guid;
    profiles[id] = profile;
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  delete_profile: function (id) {
    if (this.PID > -1) {
      if (id == this.PID) this.PID = -1;
      if (this.PID > id) this.PID--;
    }
    profiles.splice (id, 1);
    this.set_string (PROFILES_KEY, JSON.stringify (profiles));
  },

  get turbo () {
    if (current) return current.turbo;
    return true;
  },
  set turbo (val) {
    print ("set turbo");
    if (!current || (current.turbo == val)) return;
    current.turbo = val;
    this.update_current_profile ();
  },

  get cpu_cores () {
    if (current) return current.cpu;
    return 1;
  },
  set cpu_cores (val) {
    print ("set cores online");
    if (!current || (current.cpu == val)) return;
    current.cpu = val;
    this.update_current_profile ();
  },

  get min_freq () {
    if (current && current.core[0])
      return current.core[0].a;
    return 0;
  },
  set min_freq (val) {
    print ("set min_freq");
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].a != val) equal = false;
      current.core[i].a = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get max_freq () {
    if (current && current.core[0])
      return current.core[0].b;
    return 0;
  },
  set max_freq (val) {
    print ("set max_freq");
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].b != val) equal = false;
      current.core[i].b = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get governor () {
    print ("get governor");
    if (current && current.core[0])
      return current.core[0].g;
    return "";
  },
  set governor (val) {
    print ("set governor");
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.cpu; i++) {
      if (current.core[i].g != val) equal = false;
      current.core[i].g = val;
    }
    if (!equal) this.update_current_profile ();
  },

  get min_freq_pstate () {
    if (current)
      return current.minf;
    return 0;
  },
  set min_freq_pstate (val) {
    if (!current || (current.minf == val)) return;
    current.minf = val;
    this.update_current_profile ();
  },

  get max_freq_pstate () {
    if (current)
      return current.maxf;
    return 0;
  },
  set max_freq_pstate (val) {
    if (!current || (current.maxf == val)) return;
    current.maxf = val;
    this.update_current_profile ();
  },

  set_userspace: function (frequency) {
    if (!current) return;
    var equal = true;
    for (let i = 0; i < current.core; i++) {
      if (current.core[i].g != "userspace") equal = false;
      if (current.core[i].f != frequency) equal = false;
      current.core[i].g = "userspace";
      current.core[i].f = frequency;
    }
    if (!equal) this.update_current_profile ();
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
