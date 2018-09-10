/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Author (C) 2016-2018 konkor <kapa76@gmail.com>
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

const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;

var Format = imports.format;
String.prototype.format = Format.format;

function initTranslations (domain) {
    domain = domain || 'org-konkor-cpufreq';

    let localeDir = Gio.File.new_for_path (getCurrentFile()[1] + '/locale');
    if (localeDir.query_exists (null))
        Gettext.bindtextdomain (domain, localeDir.get_path());
    else
        Gettext.bindtextdomain (domain, '/usr/share/locale');
}

function getSettings (schema) {
  schema = schema || 'org.gnome.shell.extensions.cpufreq';
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

  return new Gio.Settings({ settings_schema: schemaObj });
}

function getCurrentFile () {
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

function byteArrayToString (byte_array) {
    if (byte_array instanceof ByteArray.ByteArray) {
        return byte_array.toString();
    } else if (byte_array instanceof Uint8Array) {
        return ByteArray.toString(byte_array);
    }
    return "";
}

//DOMAIN ERROR:0:RED, INFO:1:BLUE, DEBUG:2:GREEN
const domain_color = ["00;31","00;34","00;32"];
const domain_name = ["EE","II","DD"];

function info (source, msg) {
    print_msg (1, source, msg);
}

function debug (source, msg) {
    print_msg (2, source, msg);
}

function error (source, msg) {
    print_msg (0, source, msg);
}

function print_msg (domain, source, output) {
    let ds = new Date().toString ();
    let i = ds.indexOf (" GMT");
    if (i > 0) ds = ds.substring (0, i);

    if (domain == 2) print ("\x1b[%sm[%s](%s) [cpufreq][%s]\x1b[0m %s".format (
        domain_color[domain],ds,domain_name[domain],source,output));
    else {
        log ("(%s) [cpufreq][%s] %s".format (domain_name[domain], source, output));
        if (logger) logger.put ("[%s](%s) %s".format (ds, domain_name[domain], output));
    }
}
