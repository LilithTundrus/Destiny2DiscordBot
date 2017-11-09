//Global vars
'use strict';                                                       //more stringent error reporting for small things
const config = require('./config.js');                              //conifg/auth data
const ver = '0.0.001';
var Discord = require('discord.io');                                //discord API wrapper
var request = require('request');                                   //used to make call to WF worldState
var fs = require('fs');                                             //used to read helpNotes.txt
var os = require('os');                                             //os info lib built into node

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.discordToken,
    autorun: true
});

bot.on('ready', function (evt) {                                    //do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    bot.setPresence({                                               //make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Destiny 2' }
    });
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '%') {                           //listen for messages that will start with `^`
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        //log any messages sent to the bot for debugging
        fs.appendFileSync('discordMessagelog.log', `${user} sent: ${message} at ${Date.now()}`);
        console.log(`${user} sent: ${message} at ${Date.now()}`);
        args = args.splice(1);
        switch (cmd) {                                              //bot needs to know if it will execute a command
            case 'help':                                            //display the help file
                let helpMsg = fs.readFileSync('./helpNotes.txt');
                bot.sendMessage({
                    to: channelID,
                    message: '```' + helpMsg.toString() + '```'     //the ``` is there so discord treats it as monospace
                });
                break;
            case 'ver':
                bot.sendMessage({
                    to: channelID,
                    message: `Version: ${ver} Running on server: ${os.type()} ${os.hostname()} ${os.platform()} ${os.cpus()[0].model}`
                });
                break;
            case 'beh':
            bot.sendMessage({
                to: channelID,
                message: 'beh'
            });
            break;
            // Just add any case commands here -- if you run into random crashes on bad commands, add a defualt handler
        }
    }
});
