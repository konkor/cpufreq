/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var DEBUG_LVL = 0;

var Format = imports.format;
String.prototype.format = Format.format;

//DOMAIN ERROR:0:RED, INFO:1:BLUE, DEBUG:2:GREEN
const domain_color = ["00;31","00;34","00;32"];
const domain_name = ["EE","II","DD"];

function init (level) {
  level = level || 0;
  DEBUG_LVL = level;
}

function info (source, msg) {
  if (DEBUG_LVL > 0)
    print_msg (1, source, msg);
}

function debug (source, msg) {
  if (DEBUG_LVL > 1)
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
