/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2025 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import GLib from 'gi://GLib';

import {ExtensionPreferences} from 'resource:///org/gnome/shell/extensions/prefs.js';

export default class CPUFreqPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    try {
      // CPUFreq's dedicated Gtk3 preferences UI is not compatible with GNOME Shell 45+
      // preferences hosting; open the manager app instead.
      GLib.spawn_command_line_async(`${this.path}/cpufreq-application`);
    } catch (error) {
      logError(error, '[cpufreq] Failed to launch cpufreq-application');
    }

    // CPUFreq uses a dedicated preferences app; close the stub window.
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      try {
        window.close();
      } catch {
        try {
          window.destroy();
        } catch {
          // ignore
        }
      }
      return GLib.SOURCE_REMOVE;
    });
  }
}
