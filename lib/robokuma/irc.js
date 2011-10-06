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


var IRCBot = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(IRCBot.prototype, {

    initialize: function (options) {

        this.options = _.extend({
            parent: null,
            success: function () {},
            error: function () {}
        }, options);
        this.parent = this.options.parent;

        var $this = this,
             opts = this.options.irc;

        this.log("Setting up IRC");

        this.client = new irc.Client(opts.server, opts.nick, {
            port: opts.port,
            secure: opts.secure,
            channels: opts.channels,
            debug: this.parent.options.debug
        });

        this.command_handler = new CommandHandler({
            parent: $this
        });

        this.privmsg_watcher = new PrivmsgWatcher({
            parent: $this, 
            success: function () { },
            error: function (err) { }
        });

        this.channel_watchers = [];
        async.forEach(opts.channels, function (channel, fe_next) {
            var watcher = new ChannelWatcher({
                parent: $this, 
                channel: channel,
                success: function () { 
                    $this.channel_watchers.push(watcher);
                    fe_next();
                },
                error: function (err) { fe_next(err); }
            });
        }, function () {
            $this.options.success();
        });

    },

    log: function (msg) {
        return this.parent.log(msg);
    }

});


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
        this.parent = this.options.parent;

        var client = this.parent.client,
            irc_opts = this.parent.options.irc;

        client.addListener('message' + this.options.channel,
            function (from, msg) {
                $this.parent.command_handler.dispatch(
                    $this, $this.options.channel, from, msg
                );
            }
        );

        this.log("Watching channel " + this.options.channel);

        this.options.success();
    },

    say: function (to, msg) {
        var client = this.parent.client;
        client.say(this.options.channel, to + ": " + msg); 
    },

    log: function (msg) {
        if (this.parent.options.debug) { 
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
        this.parent = this.options.parent;

        var client = this.parent.client,
            irc_opts = this.parent.options.irc;

        client.addListener("pm", function (from, msg) {
            $this.parent.command_handler.dispatch($this, null, from, msg);
        });

        this.log("Watching privmsgs");

        this.options.success();
    },

    say: function (to, msg) {
        this.parent.client.say(to, msg); 
    },

    log: function (msg) {
        if (this.parent.options.debug) { 
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
            parent: null,
            commands: {}
        }, options);
        this.source = this.options.source;
        _.extend(this.commands, this.options.commands);
    },

    dispatch: function (source, channel, from, msg) {
        var $this = this,
            irc_opts = this.options.parent.options.irc,
            nick = irc_opts.nick;
        _.each(this.commands, function (set, name) {
            _.each(set, function (fn, pat) {
                var prefix = channel ? (nick+": ") : (""),
                    full_pat = prefix + pat,
                    re = new RegExp(full_pat, "gi"),
                    m = re.exec(msg);
                if (m) {
                    var reply = fn.call($this, channel, from, msg, m); 
                    if (reply) {
                        source.say(from, reply);
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
    IRCBot: IRCBot,
    ChannelWatcher: ChannelWatcher,
    PrivmsgWatcher: PrivmsgWatcher,
    CommandHandler: CommandHandler
};
