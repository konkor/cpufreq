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

var InfoLabel = new Lang.Class({
  Name: "InfoLabel",
  Extends: Gtk.Box,

  _init: function (props={}) {
    props.orientation = props.orientation || Gtk.Orientation.HORIZONTAL;
    this.parent (props);

    this.label = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.add (this.label);

    this.info = new Gtk.Label ({label:"", xalign:0.0, margin_left:8});
    this.pack_start (this.info, true, true, 8);
    this.label.connect ("notify::label", this.on_label.bind (this));
    this.info.connect ("notify::label", this.on_label.bind (this));
  },

  on_label: function (o) {
    this.visible = o.visible = !!o.label;
  },

  update: function (info) {
    info = info || "";
    if (this.info.label != info) this.info.set_text (info);
  }
});

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
