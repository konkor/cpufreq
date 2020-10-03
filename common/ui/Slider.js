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
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

var Slider = new Lang.Class({
  Name: "Slider",
  Extends: Gtk.Box,

  _init: function (text, info, tooltip) {
    this.parent ({orientation:Gtk.Orientation.VERTICAL, margin:8});
    this.margin_start = 16;
    this.get_style_context ().add_class ("slider-item");
    this.tooltip_text = tooltip;

    let box = new Gtk.Box ({orientation:Gtk.Orientation.HORIZONTAL});
    box.get_style_context ().add_class ("info-item");
    this.add (box);
    this.label = new Gtk.Label ({label:"<b>"+text+"</b>", use_markup:true, xalign:0});
    box.pack_start (this.label, true, true, 0);
    this.info = new Gtk.Label ({label:"<i>" + info + "</i>", use_markup:true});
    box.pack_end (this.info, false, false, 0);
    this.slider = Gtk.Scale.new_with_range (Gtk.Orientation.HORIZONTAL, 0, 1, 0.05);
    this.get_style_context ().add_class ("slider");
    this.slider.draw_value = false;
    this.add (this.slider);

    this.slider.connect ("scroll-event", (o) => {
      GObject.signal_stop_emission_by_name (o, "scroll-event");
      return false;
    });

    this.show_all ();
  },

  update_info: function (info) {
    this.info.set_markup ("<i>" + info + "</i>");
  }
});
