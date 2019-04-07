/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const APPDIR = getCurrentFile ()[1];

const Logger = imports.common.Logger;
const Convenience = imports.convenience;
const byteArrayToString = Convenience.byteArrayToString;

const CPUROOT = "/sys/devices/system/cpu/";

var governors = [];
var governoractual = [];
let util_present = false;
var pstate_present = false;
var thermal_throttle = false;
var cpufreqctl_path = null;
let pkexec_path = null;
var installed = false;
var updated = false;
var frequencies = [];
let minimum_freq = 0;
let maximum_freq = 0;
var minfreq = 0, maxfreq = 0;
var cpucount = 1;
var boost_present = false;
var default_profile = null;
let profile = null;

let settings = null;
let core_event = 0;
let save_changes = true;

var profile_changed_callback = null;

function init (prefs) {
  settings = prefs;
  cpucount = get_cpu_number ();

  let res = get_content (CPUROOT + "cpu0/cpufreq/scaling_driver");
  if (res) {
    util_present = true;
    if (res == "intel_pstate") pstate_present = true;
  }
  check_install ();
  check_extensions ();
  if (!settings.user_profile) {
    let p = get_profile ("Saved settings");
    p.guid = "user";
    settings.user_profile = p;
  }
  get_governors ();
  get_frequencies ();
  default_profile = get_default_profile ();
}

function check_install () {
  pkexec_path = GLib.find_program_in_path ("pkexec");
  cpufreqctl_path = GLib.find_program_in_path ("cpufreqctl");
  installed = false;
  updated = false;
  if (!cpufreqctl_path)
    cpufreqctl_path = APPDIR + "/cpufreqctl";
  else
    installed = true;
  if (!GLib.file_test ("/usr/share/polkit-1/actions/konkor.cpufreq.policy", GLib.FileTest.EXISTS)) {
    installed = false;
  }
  if (!pkexec_path) installed = false;
  if (installed) {
    let localctl = null, globalctl = null;
    globalctl = get_command_line_string ("/usr/bin/cpufreqctl version");
    localctl = get_command_line_string (APPDIR + "/cpufreqctl version");
    debug ("Versions local:%s global:%s".format (localctl, globalctl));
    updated = localctl == globalctl;
  }
}

function check_extensions () {
  if (!util_present || !installed) return;
  let save_state = settings.save;
  let default_boost = get_turbo ();
  settings.save = false;
  if (default_boost == false) {
    set_turbo (true);
    let new_state = get_turbo ();
    if (default_boost != new_state) {
      boost_present = true;
      set_turbo (false);
    }
  } else boost_present = true;
  settings.save = save_state;
  thermal_throttle = Gio.File.new_for_path (CPUROOT + "cpu0/thermal_throttle/core_throttle_count").query_exists (null);
}

function install_components (update) {
  if (!pkexec_path) return false;
  debug (pkexec_path + " " + cpufreqctl_path);
  try {
    GLib.spawn_command_line_sync ("%s %s/cpufreqctl install".format (pkexec_path, APPDIR));
  } catch (e) {
    error (e.message);
  }
  init (settings);
  return updated;
}

function power_profile (id, save) {
  save_changes = (typeof save !== 'undefined') ?  save : true;
  if (!installed) {
    if (profile_changed_callback) profile_changed_callback (id);
    return;
  }
  if ((id == "system") || (id == "default")) set_power_profile (default_profile);
  else if (id == "user") restore_saved ();
  else if (id == "battery") set_power_profile (get_battery_profile ());
  else if (id == "balanced") set_power_profile (get_balanced_profile ());
  else if (id == "performance") set_power_profile (get_performance_profile ());
  else set_power_profile (settings.get_profile (id));
}

function set_power_profile (prf) {
  if (!prf) return;
  if (!settings_equal (prf, get_profile ()))
    load_profile (prf);
  else if (profile_changed_callback)
    profile_changed_callback (prf);
  if (save_changes) {
    settings.save = prf.guid != default_profile.guid;
    settings.guid = prf.guid;
  }
}

function get_default_profile () {
  if (!util_present || !installed) return null;
  let cores = [];

  for (let key = 0; key < cpucount; key++) {
    let core = {
      g: pstate_present?"powersave":"ondemand",
      a: minimum_freq,
      b: maximum_freq
    };
    cores.push (core);
  }
  let p = {
    name:"Default", minf:0, maxf:100, turbo:boost_present, cpu:cpucount,
    acpi:!pstate_present, guid:"default", core:cores
  };
  debug (JSON.stringify (p));
  return p;
}

// "balance" - turbo:OFF, governors: ondemand|performance
function get_balanced_profile () {
  let p = get_default_profile ();
  p.guid = "balanced";
  p.name = "Balanced";
  p.turbo = false;
  if (pstate_present) p.core.forEach (p => {
    p.g = "performance";
  });
  debug (JSON.stringify (p));
  return p;
}

// "battery" - turbo:OFF, cores:2/3, max frequency:2Ghz, governor:powersave
function get_battery_profile () {
  let p = get_default_profile (), g = "", f = 0;
  //Detect suitable governor and frequency about 2Ghz
  if (!pstate_present) {
    if (governors.indexOf ("schedutil") > -1) g = "schedutil";
    else if (governors.indexOf ("conservative") > -1) g = "conservative";
    else if (governors.indexOf ("ondemand") > -1) g = "ondemand";
    else if (governors.indexOf ("powersave") > -1) g = "powersave";
    else g = p.core[0].g;
    frequencies.forEach (a => {
      if (!f && a >= 2000000) f = a;
    });
    if (!f) f = maximum_freq;
  }
  //TODO: Is it too aggressive?
  let cores = Math.round (p.cpu * 2 / 3);
  if (cores % 2) cores++;
  if (cores < 2) cores = 2;
  if (cores > cpucount) cores = cpucount;
  p.cpu = cores;
  p.guid = "battery";
  p.name = "Powersave";
  p.turbo = false;
  p.core.forEach (p => {
    if (pstate_present) p.g = "powersave";
    else {
      p.g = g;
      p.b = f;
    }
  });
  debug (JSON.stringify (p));
  return p;
}

// "performance" - turbo:ON, min/max:50%/100%, governor:performance/ondemand
function get_performance_profile () {
  let p = get_default_profile ();
  p.guid = "performance";
  p.name = "Performance";
  p.minf = 50;
  p.core.forEach (p => {
    if (pstate_present) p.g = "performance";
    else p.a = get_freq (50);
  });
  debug (JSON.stringify (p));
  return p;
}

function get_profile (name, guid) {
  guid = guid || Gio.dbus_generate_guid ();
  name = name || guid;
  let cores = [];
  let minf = 0, maxf = 100;

  if (pstate_present) {
    minf = minfreq;
    maxf = maxfreq;
  }
  for (let key = 0; key < cpucount; key++) {
    let core = {
      g: get_governor (key),
      a: get_coremin (key),
      b: get_coremax (key)
    };
    if (core.g == "userspace")
      core.f = get_frequency (key);
    cores.push (core);
  }
  let p = {
    name:name, minf:minf, maxf:maxf, turbo:get_turbo (),
    cpu:GLib.get_num_processors (),
    acpi:!pstate_present, guid:guid,
    core:cores
  };
  debug (JSON.stringify (p));
  return p;
}

function restore_saved () {
  var prf;
  if (settings.guid == settings.user_profile.guid) {
    prf = settings.user_profile;
    if (!settings_equal (prf, get_profile ()))
      load_profile (prf);
    else if (profile_changed_callback)
      profile_changed_callback (prf);
  } else power_profile (settings.guid);
}

function settings_equal (a, b) {
  if (!a || !b) return false;
  if (a.cpu != b.cpu) return false;
  if (a.core.length != b.core.length) return false;
  if (a.minf != b.minf) return false;
  if (a.maxf != b.maxf) return false;
  if (a.turbo != b.turbo) return false;
  for (let key = 0; key < a.core.length; key++) {
    if (a.core[key].g != b.core[key].g) return false;
    if (a.core[key].a != b.core[key].a) return false;
    if (a.core[key].b != b.core[key].b) return false;
    if (a.core[key].f && a.core[key].f != b.core[key].f) return false;
  }
  return true;
}

let stage = 0;
let install_event = 0;

function load_profile (prf) {
  if (install_event || !prf) {
    if (profile_changed_callback) profile_changed_callback (prf);
    return;
  }
  debug ("Loading profile...\n" + JSON.stringify (prf));
  profile = prf;
  for (let key = 1; key < cpucount; key++) {
    set_core (key, true);
  }
  stage = 0;
  delayed_load ();
}

function delayed_load () {
  let delay = 1000;
  if (core_event != 0) {
    GLib.source_remove (core_event);
    core_event = 0;
  }
  debug ("Delayed loading of stage: " + stage);
  stage++;
  load_stage (profile);
  switch (stage) {
    case 1: // reset min/max frequencies
      delay = 50;
      break;
    case 2: // setting governors
      delay = 50;
      break;
    case 3: // setting boost
      delay = 50;
      break;
    case 4: // setting min frequency
      delay = 50;
      break;
    case 5: // setting max frequency
      delay = 50;
      break;
    case 6: // enable/disable cores
      delay = 50;
      break;
    default:
      return false;
  }
  core_event = GLib.timeout_add (0, delay, delayed_load);
  return false;
}

function load_stage (prf) {
  debug ("Loading stage: " + stage);
  if (stage == 1) {
    if (pstate_present) {
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " min 0");
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " max 100");
    } else {
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " minf " + get_freq (0));
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " maxf " + get_freq (100));
    }
  } else if (stage == 2) {
    for (let key = 0; key < cpucount; key++) {
      if (prf.core[key])
        set_governor (key, prf.core[key].g);
    }
  } else if (stage == 3) {
    set_turbo (prf.turbo);
  } else if (stage == 4) {
    if (pstate_present) {
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " min " + prf.minf);
    } else {
      for (let key = 0; key < cpucount; key++) {
        if (prf.core[key]) {
          set_coremin (key, prf.core[key].a);
        }
      }
    }
  } else if (stage == 5) {
    if (pstate_present) {
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " max " + prf.maxf);
    } else {
      for (let key = 0; key < cpucount; key++) {
        if (prf.core[key]) {
          set_coremax (key, prf.core[key].b);
        }
      }
    }
  } else if (stage == 6) {
    for (let key = 1; key < cpucount; key++) {
      set_core (key, key < prf.cpu);
    }
    if (profile_changed_callback)
      GLib.timeout_add (0, 500, () => {
        profile_changed_callback (profile);
        return false;
      });
  }
}

function get_turbo () {
  if (!util_present) return false;
  var res = null;
  if (pstate_present) res = get_cpufreq_info ("turbo");
  else res = get_cpufreq_info ("boost");
  if (res) {
    if (pstate_present && res == '0') return true;
    if (!pstate_present && res == '1') return true;
  }
  return false;
}

function set_turbo (state) {
  if (!util_present) return false;
  if (pstate_present) {
    if (state)
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " turbo 0");
    else GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " turbo 1");
  } else {
    if (state)
      GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " boost 1");
    else GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " boost 0");
  }
  if (settings.save) settings.turbo = state;
  return state;
}

function get_governors () {
  if (!util_present) return governors;
  let governorslist = [], res;
  governors = [];
  governoractual = [];

  let cc = GLib.get_num_processors ();
  for (let i = 0; i < cc; i++) {
    let s = get_content_string (CPUROOT + "cpu" + i + "/cpufreq/scaling_governor");
    if (s) governoractual.push (s);
  }

  res = get_content_string (CPUROOT + "cpu0/cpufreq/scaling_available_governors");
  if (res) governorslist = res.toString().split(" ");
  else governorslist = [];
  governorslist.forEach ((governor) => {
    if (governor) governors.push (governor);
  });

  return governors;
}

function set_governors (governor) {
  if (!util_present || !governor) return;

  GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov " + governor);

  if (settings.save) settings.governor = governor;
}

function is_mixed_governors () {
  let mixed = false;
  for ( let i = 0; i < governoractual.length-1; i++) {
    if (governoractual[i] != governoractual[i+1]) mixed = true;
  }
  return mixed;
}

function get_governor (core) {
  let g = pstate_present?"powersave":"ondemand";
  core = core || 0;
  if (!util_present) return g;
  let res = get_content_string (CPUROOT + "cpu" + core + "/cpufreq/scaling_governor");
  if (res) g = res;
  return g;
}

function set_governor (core, governor) {
  core = core || 0;
  if (!util_present || !governor) return;
  GLib.spawn_command_line_sync (
    pkexec_path + " " + cpufreqctl_path + " coreg " + core + " " + governor
  );
}

function set_userspace (frequency) {
  if (!util_present || !frequency) return 0;

  GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " gov userspace");
  GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " set " + frequency);

  settings.set_userspace (frequency.toString ());

  return frequency;
}

function get_frequencies () {
  let frequencieslist = [];
  frequencies = [];
  if (!util_present) return;
  if (pstate_present) {
    minfreq = get_min_pstate ();
    maxfreq = get_max_pstate ();
    return;
  } else {
    minfreq = get_min ();
    maxfreq = get_max ();
  }
  frequencieslist = get_content_string (CPUROOT + "cpu0/cpufreq/scaling_available_frequencies");
  if (!frequencieslist) return;
  frequencieslist = frequencieslist.split (" ");
  frequencieslist.forEach ((freq)=> {
    if (freq.length > 0)
      if (parseInt (freq) > 0) frequencies.unshift (freq);
  });
  if (frequencies.length > 0) {
    minimum_freq = frequencies[0];
    maximum_freq = frequencies[frequencies.length - 1];
  }
}

function set_frequencies () {
  let cmin, cmax;
  if (pstate_present) {
    cmin = get_min_pstate ();
    cmax = get_max_pstate ();
    debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
    if ((minfreq == cmin) && (maxfreq == cmax)) return;
    if ((minfreq > cmax) && (minfreq <= maxfreq)) {
      set_max_pstate (maxfreq);
      pause (100);
      set_min_pstate (minfreq);
    } else {
      if (minfreq != cmin) set_min_pstate (minfreq);
      pause (100);
      if (maxfreq != cmax) set_max_pstate (maxfreq);
    }
  } else {
    cmin = get_coremin (0);
    cmax = get_coremax (0);
    debug ("%d:%d - %d:%d".format (cmin,cmax,minfreq,maxfreq));
    if ((minfreq == cmin) && (maxfreq == cmax)) return;
    if ((minfreq > cmax) && (minfreq <= maxfreq)) {
      set_max (maxfreq);
      pause (100);
      set_min (minfreq);
    } else {
      if (minfreq != cmin) set_min (minfreq);
      pause (100);
      if (maxfreq != cmax) set_max (maxfreq);
    }
  }
}

function get_coremin (core) {
  if (!util_present) return 0;
  var res = get_content_string (CPUROOT + "cpu" + core + "/cpufreq/scaling_min_freq");
  if (res) return parseInt (res);
  return 0;
}

function set_coremin (core, state) {
  if (!util_present) return false;
  try {
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremin " + core + " " + state);
  } catch (e) {
    error ("Set coremin" + e.message);
    return false;
  }
  return true;
}

function get_coremax (core) {
  if (!util_present) return 0;
  var res = get_content_string (CPUROOT + "cpu" + core + "/cpufreq/scaling_max_freq");
  if (res) return parseInt (res);
  return 0;
}

function set_coremax (core, state) {
  if (!util_present) return false;
  try {
    GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " coremax " + core + " " + state);
  } catch (e) {
    error ("Set coremax" + e.message);
    return false;
  }
  return true;
}

function get_min () {
  if (!util_present) return minimum_freq;
  var res = get_content_string (CPUROOT + "cpu0/cpufreq/scaling_min_freq");
  if (res) return parseInt (res);
  return minimum_freq;
}

function set_min (minimum) {
  if ((minimum <= 0) || !Number.isInteger (minimum)) return 0;
  if (!util_present) return 0;
  GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " minf " + minimum.toString());
  if (settings.save) settings.min_freq = minimum.toString ();
  return minimum;
}

function get_max () {
  if (!util_present) return maximum_freq;
  var res = get_content_string (CPUROOT + "cpu0/cpufreq/scaling_max_freq");
  if (res) return parseInt (res);
  return maximum_freq;
}

function set_max (maximum) {
  if ((maximum <= 0) || !Number.isInteger (maximum)) return 0;
  if (!util_present) return 0;
  GLib.spawn_command_line_sync (pkexec_path + " " + cpufreqctl_path + " maxf " + maximum.toString());
  if (settings.save) settings.max_freq = maximum.toString ();
  return maximum;
}

function get_min_pstate () {
  if (!util_present) return 0;
  var res = get_content_string (CPUROOT + "intel_pstate/min_perf_pct");
  if (res) return parseInt (res);
  return 0;
}

function set_min_pstate (minimum) {
  if (!util_present) return 0;
  GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " min " + minimum.toString());
  if (settings.save) settings.min_freq_pstate = minimum;
  return minimum;
}

function get_max_pstate () {
  if (!util_present) return 0;
  var res = get_content_string (CPUROOT + "intel_pstate/max_perf_pct");
  if (res) return parseInt (res);
  return 0;
}

function set_max_pstate (maximum) {
  if (!util_present) return 100;
  GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " max " + maximum.toString());
  if (settings.save) settings.max_freq_pstate = maximum;
  return maximum;
}

function set_core (core, state) {
  if (!util_present) return false;
  util_present = false;
  if (state)
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " on " + core);
  else
    GLib.spawn_command_line_sync (pkexec_path + ' ' + cpufreqctl_path + " off " + core);
  util_present = true;
  return state;
}

function set_cores (count, callback) {
  let ccore = count;
  if (core_event != 0) {
    GLib.source_remove (core_event);
    core_event = 0;
  }
  if (count == GLib.get_num_processors ()) return;
  core_event = GLib.timeout_add_seconds (0, 2, Lang.bind (this, function () {
    for (let key = 1; key < cpucount; key++) {
      set_core (key, key < ccore);
    }
    if (settings.save) settings.cpu_cores = ccore;
    core_event = 0;
    if (callback) callback ();
    return false;
  }));
}

function pause (msec) {
  var t = Date.now ();
  var i = 0;
  while ((Date.now () - t) < msec) i++;
}

//TODO: move it to cpufreqctl?!
function get_frequency_async (num, callback) {
  let label = "";
  num = num || 0;
  if (!callback) return;
  let file = Gio.File.new_for_path ("/sys/devices/system/cpu/cpu" + num + "/cpufreq/scaling_cur_freq");
  file.load_contents_async (null, (o, res) => {
    let [success, contents] = o.load_contents_finish (res);
    if (!success) return;
    try {
      contents = byteArrayToString (contents).toString ().split ("\n")[0].trim ();
      var n = parseInt (contents);
      if (Number.isInteger (n)) {
      if (n >= 1000000) {
        label = (n / 1000000).toFixed(2).toString () + " \u3393";
      } else {
        label = (m / 1000).toFixed(0).toString () + "  \u3392";
      }
      }
      callback (label);
    } catch (e) {}
  });
}

function get_frequency (core) {
  let n = 0;
  core = core || 0;
  let file = Gio.File.new_for_path ("/sys/devices/system/cpu/cpu" + core + "/cpufreq/scaling_cur_freq");
  try {
    let [success, contents, etag] = file.load_contents (null);
    if (!success) return 0;
    contents = byteArrayToString (contents).toString ().split ("\n")[0].trim ();
    n = parseInt (contents);
    if (!Number.isInteger (n)) n = 0;
  } catch (e) {
    n = 0;
  }
  debug ("Core %d frequency is %d".format (core, n));
  return n;
}

function get_freq (num) {
  let n = frequencies.length - 1;
  if (n < 1) n = 1;
  let step = Math.round (100 / n);
  let i = Math.round (num / step);
  if (i > n) i = n - 1;
  return parseInt (frequencies[i]);
}

function get_pos (num) {
  let m = parseFloat (frequencies[frequencies.length -1]) - parseFloat (frequencies[0]);
  let p = (parseFloat (num) - parseFloat (frequencies[0]))/m;
  return p;
}

function get_cpu_number () {
  let c = 0;
  let cpulist = null;
  let ret = GLib.spawn_command_line_sync ("cat /sys/devices/system/cpu/present");
  if (ret[0]) cpulist = byteArrayToString (ret[1]).toString().split("\n", 1)[0].split("-");
  cpulist.forEach ((f)=> {
    if (parseInt (f) > 0) c = parseInt (f);
  });
  return c + 1;
}

function get_throttle () {
  if (!thermal_throttle) return 0;
  let tc = 0, cc = GLib.get_num_processors (), s;
  for (let i = 0; i < cc; i++) {
    s = get_content (CPUROOT + "cpu" + i + "/thermal_throttle/core_throttle_count");
    if (s) tc += parseInt (s);
  }
  return tc;
}

function get_throttle_events () {
  if (!updated) return 0;
  let tc = parseInt (get_command_line_string (pkexec_path + " " + cpufreqctl_path + " throttle_events"));
  if (!Number.isInteger (tc)) tc = 0;
  return tc;
}

let cmd_out, info_out;
function get_command_line (cmd) {
  cmd_out = GLib.spawn_command_line_sync (cmd);
  if (cmd_out[0]) info_out = byteArrayToString (cmd_out[1]).toString ();
  if (info_out) return info_out;
  return "";
}

function get_command_line_string (cmd) {
  return get_command_line (cmd).split ("\n")[0];
}

function get_cpufreq_info (params) {
  let s = null;
  if (!params) return s;

  if (params == "turbo") s = get_content_string (CPUROOT + "intel_pstate/no_turbo");
  else if (params == "boost") s = get_content_string (CPUROOT + "cpufreq/boost");
  else if (params == "throttle") s = get_throttle ();
  else s = get_command_line_string (pkexec_path + " " + cpufreqctl_path + " " + params);
  return s;
}

function get_content_string (path) {
  let contents = get_content (path);
  if (contents) contents = contents.split ("\n")[0].trim ();
  return contents;
}

function get_content (path) {
  let success = false, contents = "";
  if (!path) return contents;

  let file = Gio.file_new_for_path (path);
  try {
    [success, contents, ] = file.load_contents (null);
    if (success) contents = byteArrayToString (contents).toString ().trim ();
  } catch (e) {
    error (e.message);
  }
  return contents;
}

function get_content_async (path, callback) {
  let success = false, contents = null;
  if (!callback) return;
  if (!path) {
    callback (success, contents);
    return;
  }
  let file = Gio.file_new_for_path (path);
  file.load_contents_async (null, (o, res) => {
    [success, contents] = o.load_contents_finish (res);
    if (success) try {
      contents = byteArrayToString (contents).toString ().trim ();
    } catch (e) {}
    if (callback) callback (success, contents);
  });
}

function debug (msg) {
  Logger.debug ("cpu helper", msg);
}

function error (msg) {
  Logger.error ("cpu helper", msg);
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
