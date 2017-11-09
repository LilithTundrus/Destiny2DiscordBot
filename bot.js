//Global vars
'use strict';                                                       //more stringent error reporting for small things
const config = require('./config.js');                              //conifg/auth data
const ver = '0.0.001';
var Discord = require('discord.io');                                //discord API wrapper
var request = require('request');                                   //used to make call to WF worldState
var fs = require('fs');                                             //used to read helpNotes.txt
var os = require('os');                                             //os info lib built into node

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.token,
    autorun: true
});

bot.on('ready', function (evt) {                                    //do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    bot.setPresence({                                               //make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Debug Mode' }
    });
});