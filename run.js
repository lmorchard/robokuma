#!/usr/bin/env node

require.paths.unshift('./node_modules')
require.paths.unshift('./extlib')
require.paths.unshift('./lib')

var robokuma = require("robokuma/index"),
    bot = new robokuma.Robokuma();

bot.run();
