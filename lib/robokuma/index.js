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
    express = require("express"),
    robokuma_irc = require("robokuma/irc");


var Robokuma = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(Robokuma.prototype, {

    initialize: function (options) {
        this.options = _.extend({
            "config_path": __dirname + "/../../conf/default.json",
            "data_path": __dirname + "/../../data",

            "debug": true,
            "httpd": {
                "port": 8081
            },
            "irc": {
                "nick": "robokuma",
                "server": "irc.mozilla.org",
                "port": 6697,
                "secure": true,
                "channels": [ "#lorchard" ]
            }
        }, options);

        this.channel_watchers = [];
    },

    log: function (msg) {
        if (this.options.debug) { util.debug(msg); }
    },

    loadConfig: function (next) {
        var $this = this,
            path = this.options.config_path;
        fs.lstat(path, function (err, stats) {
            if (err || !stats.isFile()) { return next(); }
            fs.readFile(path, 'utf8', function (err, data) {
                if (err) { return next(); }
                _.extend($this.options, JSON.parse(data));
                next();
            });
        });
    },

    setupHTTPD: function (next) {
        var opts = this.options.httpd;

        this.log("Setting up httpd on port " + opts.port);
        this.httpd = express.createServer();
        this.httpd.get('/', function(req, res) {
            res.send("HELLO WORLD GOOOOO");
        });
        this.httpd.listen(opts.port);
        next();
    },

    run: function () {
        var $this = this;
        async.waterfall([

            _.bind(this.loadConfig, this),
            
            function (next) {
                $this.ircbot = new robokuma_irc.IRCBot({
                    irc: $this.options.irc,
                    parent: $this,
                    success: function () { next(); }
                });
            },
            
            _.bind(this.setupHTTPD, this),

            function (next) {
                var r_ctx = {
                    u: _,
                    Backbone: Backbone,
                    bot: this
                };

                var r_local = repl.start("sr> ");
                _.extend(r_local.context, r_ctx);
            }

        ]);
    }
});


module.exports = {
    Robokuma: Robokuma
};
