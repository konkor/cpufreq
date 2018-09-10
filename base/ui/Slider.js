/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2018 konkor <github.com/konkor>
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

const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

var Slider = new Lang.Class({
    Name: "Slider",
    Extends: Gtk.Box,

    _init: function (text, info, tooltip) {
        this.parent ({orientation:Gtk.Orientation.VERTICAL,margin:22});
        this.margin_top = 8;
        this.margin_bottom = 8;
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

        this.show_all ();
    },

    update_info: function (info) {
        this.info.set_markup ("<i>" + info + "</i>");
    }
});
