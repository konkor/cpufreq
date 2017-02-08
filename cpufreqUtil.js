const Lang = imports.lang;
const GLib = imports.gi.GLib;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const CommandLineUtil = Me.imports.commandLineUtil;
const EXTENSIONDIR = Me.dir.get_path ();

const CpufreqUtil = new Lang.Class({
    Name: 'CpufreqUtil',
    Extends: CommandLineUtil.CommandLineUtil,

    _init: function() {
        this.parent();
        let path = EXTENSIONDIR + '/cpufreqctl';
        this._argv = path ? [path, 'info'] : null;
    },

    get freq() {
        if(!this._output)
            return '1';
        let cur_freq = null;
        for each(let line in this._output) {
            if(!line)
                continue;
            let r = line;
            cur_freq = r;
        }

        if(!cur_freq) return '1';

        return cur_freq;
    }

});
