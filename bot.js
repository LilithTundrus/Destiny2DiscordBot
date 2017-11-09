//Global vars
'use strict';                                                       // allow less 'bad' code
//custom requires
const config = require('./config.js');                              // conifg/auth data
//npm packages
var Discord = require('discord.io');                                // discord API wrapper
var request = require('request');                                   // used to make call to WF worldState
var Traveler = require('the-traveler').default;                     //Destiny 2 API wrapper
const Enums = require('the-traveler/build/enums');                  // Get type enums for the-traveler wrapper
//Built-in requires
var fs = require('fs');                                             // used to read helpNotes.txt
var os = require('os');                                             // os info lib built into node
const ver = '0.0.003';
/*
TODO: Create a really good middleware solution for the Destiny/Traveler API

*/

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.discordToken,
    autorun: true
});


const traveler = new Traveler({
    apikey: config.destiny2Token,
    userAgent: `Node ${process.version}`,                           //used to identify your request to the API
    debug: true
});

//Access the enums (example componentType profiles)
var profilesType = Enums.ComponentType.Profiles;


bot.on('ready', function (evt) {                                    //do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    console.log(`Bot version ${ver} started at ${new Date().toISOString()}`);
    bot.setPresence({                                               //make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Destiny 2' }
    });
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '%') {                           //listen for messages that will start with `^`
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        //log any messages sent to the bot to the console and to file for debugging
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
            case 'search':
                searchForDestinyPlayer('crazycoffee')
                    .then((playerData) => {
                        bot.sendMessage({
                            to: channelID,
                            message: playerData
                        });
                    })
                break;
            case 'ms':
                getMileStones()
                    .then(mileStones => {
                        bot.sendMessage({
                            to: channelID,
                            message: mileStones
                        });
                    })
                break;
            case 'manifest':
                downloadDestinyManifest()
                    .then(message => {
                        bot.sendMessage({
                            to: channelID,
                            message: message
                        });
                    })
                break;
            // Just add any case commands here -- if you run into random crashes on bad commands, add a defualt handler
        }
    }
});

function searchForDestinyPlayer(playerArg) {
    return traveler
        .searchDestinyPlayer('4', 'spispartan')
        .then(player => {
            console.log(player);
            return player;
        }).catch(err => {
            console.log(err);
            return err;
        })
}

//this should be renamed since it's aggregating a lot of data from multiple D2 API endpoints
function getMileStones() {
    return traveler
        .getPublicMilestones()
        .then(data => {
            //get the data.Response object keys since they are hashes and can change
            Object.keys(data.Response).forEach(function (key) {
                console.log(key, data.Response[key].endDate);
                console.log(key, data.Response[key]);
                console.log('\n' + key)
                //once we have the hash(key) we can call the getMileStoneContent to get the rest of the data
                return traveler.getPublicMilestoneContent(key)
                    .then(mileStoneData => {
                        console.log(mileStoneData.Response);
                    })
            });
            return JSON.stringify(data.Response).substring(0, 1000);
        })
        .catch(err => {
            console.log(err);
        })
}

//get the API structure JSON --this will be important later
function downloadDestinyManifest() {
    return traveler.getDestinyManifest()
        .then((manifest) => {
            fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2));
        })
        .then(() => {
            return 'Manifest written to file!';                     //return a success message
        })
        .catch(err => {
            return err;
        })
}


