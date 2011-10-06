require.paths.unshift(__dirname + '/../node_modules')
require.paths.unshift(__dirname + '/../extlib')
require.paths.unshift(__dirname + '/../lib')

var fs = require("fs"),
    util = require("util"),
    async = require("async"),
    _ = require("underscore"),
    nodeunit = require("nodeunit"),
    robokuma = require("robokuma"),
    robokuma_irc = require("robokuma/irc");


var TestWatcher = function (options) {
    this.initialize.apply(this, arguments);
};
_.extend(TestWatcher.prototype, {
    initialize: function (options) {
        var $this = this;
        this.options = _.extend({
            "channel": null,
            "handler": null,
            "success": function () {},
            "error": function () {}
        }, options);
        this.log = [];
        this.command_handler = new robokuma_irc.CommandHandler({
            source: this
        });
    },
    recv: function (from, msg) {
        this.command_handler.dispatch(from, msg);
    },
    say: function (to, msg) {
        this.log.push(to + ": " + msg);
    }
});


module.exports = nodeunit.testCase({

    setUp: function (next) {
        next();
    },

    tearDown: function (next) {
        next();
    },

    "Basic commands are dispatched": function (test) {
        var watcher = new TestWatcher({ });

        watcher.command_handler.commands.test = {
            "say hello": function (from, msg, m) {
                return "hello there";  
            }
        };

        watcher.recv('lmorchard', 'botsnack');
        test.ok("lmorchard: Nom nom, thank you! :D", watcher.log.pop());

        watcher.recv('lmorchard', 'say hello');
        test.ok("lmorchard: hello there", watcher.log.pop());

        test.done();
    }

});
