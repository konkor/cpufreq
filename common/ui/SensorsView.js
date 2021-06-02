/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2021 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Lang = imports.lang;

const TIME_INTERVAL = 5;
let timer_id = 0;

var SensorsView = new Lang.Class({
  Name: "SensorsView",
  Extends: Gtk.ScrolledWindow,

  _init: function (owner) {
    this.parent ();
    this.utils = owner.cpufreq;
    this.vscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    this.hscrollbar_policy = Gtk.PolicyType.NEVER;
    this.shadow_type = Gtk.ShadowType.NONE;

    this.content = new Gtk.Box ({orientation:Gtk.Orientation.VERTICAL, margin:24});
    this.add (this.content);

    this.info = new Gtk.Label ({label:"Sensors", wrap: true, xalign:0.0, yalign:0.0});
    this.content.pack_start (this.info, true, true, 16);

    this.connect ('map', this.on_maping.bind (this));
    this.connect ('unmap', this.on_unmaping.bind (this));
  },

  on_maping: function (o) {
    if (timer_id) this.on_unmap ();
    this.update ();
    timer_id = GLib.timeout_add_seconds (0, TIME_INTERVAL, () => {
      this.update ();
      return true;
    });
  },

  on_unmaping: function (o) {
    if (timer_id) GLib.source_remove (timer_id);
    timer_id = 0;
  },

  update: function (o) {
    this.info.label = this.utils.get_sensors_info ();
  }

});
