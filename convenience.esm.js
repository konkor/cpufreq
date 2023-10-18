/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// import GLib from 'gi://GLib';
// import Gio from 'gi://Gio';

// @deprecated use extension.getSettings()
export function getSettings (extension) {
  // schema = schema || 'org.gnome.shell.extensions.cpufreq';
  // const GioSSS = Gio.SettingsSchemaSource;
  // let schemaDir = Gio.File.new_for_path (getCurrentFile()[1] + '/schemas');
  // let schemaSource;

  // if (schemaDir.query_exists (null))
  //   schemaSource = GioSSS.new_from_directory (
  //     schemaDir.get_path (), GioSSS.get_default (), false
  //   );
  // else{
  //   schemaSource = GioSSS.get_default ();
  // }
  // let schemaObj = schemaSource.lookup (schema, true);
  // if (!schemaObj)
  //   throw new Error ('Schema ' + schema + ' could not be found for extension ' +
  //     'cpufreq@konkor. Please check your installation.');
// 
  // return new Gio.Settings ({ settings_schema: schemaObj });
  return extension.getSettings();
}

export  function getCurrentFile () {
  let stack = (new Error()).stack;
  let stackLine = stack.split('\n')[1];
  if (!stackLine)
    throw new Error ('Could not find current file');
  let match = new RegExp ('@(.+):\\d+').exec(stackLine);
  if (!match)
    throw new Error ('Could not find current file');
  let path = match[1];
  let file = Gio.File.new_for_path (path);
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}

export function byteArrayToString (array) {
  return array instanceof Uint8Array ? new TextDecoder().decode(array):array;
}

export function get_cpu_number () {
  let c = 0;
  let cpulist = null;
  let ret = GLib.spawn_command_line_sync ("cat /sys/devices/system/cpu/present");
  if (ret[0]) cpulist = byteArrayToString(ret[1]).toString().split("\n", 1)[0].split("-");
  cpulist.forEach ((f) => {
    if (parseInt (f) > 0) c = parseInt (f);
  });
  return c + 1;
}

