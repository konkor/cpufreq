#!/usr/bin/gjs

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

var APPDIR = getCurrentFile ()[1];
imports.searchPath.unshift (APPDIR);
const Convenience = imports.convenience;

let settings = Convenience.getSettings ();


print ("battery");
set_percentage (100);
set_state (2);
sleep (2000);

set_percentage (90);
sleep (2000);
set_percentage (80);
sleep (2000);
set_percentage (70);
sleep (2000);
set_percentage (50);
sleep (2000);

set_state (4);
sleep (2000);

set_percentage (70);
sleep (2000);
set_percentage (80);
sleep (2000);
set_percentage (90);
sleep (2000);

set_percentage (100);
set_state (0);


function sleep (ms) {
  print ("sleeping " + ms + "ms");
  //GLib.usleep (ms);
  ms = ms || 0;
  let context = GLib.MainContext.default ();
  let d = Date.now ();
  while ((Date.now() - d) < ms) context.iteration (false);
}

function set_state (state) {
  print ("setting state " + state);
  settings.set_uint ('power-state', state);
}

function set_percentage (state) {
  print ("battery percentage " + state + "%");
  settings.set_double ('power-percentage', state);
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
