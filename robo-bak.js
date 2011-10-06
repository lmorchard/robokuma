//
//
var fs = require("fs"),
    util = require("util"),
    net = require("net"),
    repl = require("repl"),
    optparse = require("optparse"),
    async = require("async"),
    _ = require("underscore"),
    Backbone = require("backbone"),
    dirty = require("dirty"),
    irc = require("irc/lib/irc.js"),
    express = require("express");


var ChannelWatcher = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(ChannelWatcher.prototype, {

    initialize: function (options) {
        var $this = this;

        this.options = _.extend({
            "parent": null,
            "channel": null,
            "success": function () {},
            "error": function () {}
        }, options);

        var client = this.options.parent.ircc,
            irc_opts = this.options.parent.options.irc;

        this.command_handler = new CommandHandler({
            source: this,
            prefix: irc_opts.nick + ": "
        });

        client.addListener('message' + this.options.channel,
            function (from, msg) {
                $this.command_handler.dispatch(from, msg);
            }
        );

        this.log("Watching channel " + this.options.channel);

        this.options.success();
    },

    say: function (to, msg) {
        var client = this.options.parent.ircc;
        client.say(this.options.channel, to + ": " + msg); 
    },

    log: function (msg) {
        if (this.options.parent.options.debug) { 
            util.debug(this.options.channel + ' - ' + msg);
        }
    }

});


var PrivmsgWatcher = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(PrivmsgWatcher.prototype, {
    
    initialize: function (options) {
        var $this = this;

        this.options = _.extend({
            "parent": null,
            "channel": null,
            "success": function () {},
            "error": function () {}
        }, options);

        var client = this.options.parent.ircc,
            irc_opts = this.options.parent.options.irc;

        this.command_handler = new CommandHandler({
            source: this,
            prefix: ""
        });

        client.addListener("pm", function (from, msg) {
            $this.command_handler.dispatch(from, msg);
        });

        this.log("Watching privmsgs");

        this.options.success();
    },

    say: function (to, msg) {
        var client = this.options.parent.ircc;
        client.say(to, msg); 
    },

    log: function (msg) {
        if (this.options.parent.options.debug) { 
            util.debug('(privmsg) - ' + msg);
        }
    }

});


var CommandHandler = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(CommandHandler.prototype, {

    initialize: function (options) {
        var $this = this;
        this.options = _.extend({
            source: null,
            prefix: "",
            commands: {}
        }, options);
        this.source = this.options.source;
        _.extend(this.commands, this.options.commands);
    },

    dispatch: function (from, msg) {
        var $this = this;
        _.each(this.commands, function (set, name) {
            _.each(set, function (fn, pat) {
                var fp = $this.options.prefix + pat,
                    re = new RegExp(fp, "gi"),
                    m = re.exec(msg);
                if (m) {
                    var reply = fn.call($this, from, msg, m); 
                    if (reply) {
                        $this.source.say(from, reply);
                    }
                }
            });
        });
    },

    commands: {
        "default" : {
            "botsnack": function (from, msg, m) {
                return "Nom nom, thank you! :D";
            }
        }
    }

});


module.exports = {
    ChannelWatcher: ChannelWatcher,
    PrivmsgWatcher: PrivmsgWatcher,
    CommandHandler: CommandHandler
};
