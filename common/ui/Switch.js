/*
 * This is a part of CPUFreq Manager
 * Copyright (C) 2016-2019 konkor <konkor.github.io>
 *
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * You should have received a copy of the GNU General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

var Switch = new Lang.Class({
  Name: "Switch",
  Extends: Gtk.Box,

  _init: function (text, state, tooltip) {
    this.parent ({orientation:Gtk.Orientation.HORIZONTAL,margin:8});
    state = state || false;
    this.margin_start = 16;
    this.get_style_context ().add_class ("switch");
    this.tooltip_text = tooltip;

    this.label = new Gtk.Label ({label:"<b>"+text+"</b>", use_markup:true, xalign:0});
    this.pack_start (this.label, true, true, 0);
    this.sw = new Gtk.Switch ();
    this.sw.get_style_context ().add_class ("switch-item");
    this.sw.active = state;
    this.pack_end (this.sw, false, false, 0);

    this.show_all ();
  },

  get active () { return this.sw.active; },
  set active (val) {
    this.sw.active = val;
  }


});
