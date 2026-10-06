import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CpuFreqPreferences extends ExtensionPreferences {
  getPreferencesWidget () {
    const openPreferences = () => {
      GLib.spawn_command_line_async (GLib.shell_quote(this.path + '/cpufreq-preferences'));
    };
    const button = new Gtk.Button ({
      label: 'Open CPUFreq Preferences',
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.CENTER,
    });
    button.connect ('clicked', openPreferences);
    openPreferences ();
    return button;
  }
}
