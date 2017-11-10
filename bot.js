//Global vars
'use strict';                                                       // Allow less 'bad' code
//custom requires
const config = require('./config.js');                              // Conifg/auth data
//npm packages
var Discord = require('discord.io');                                // Discord API wrapper
var request = require('request');                                   // Used to make call to WF worldState
var Traveler = require('the-traveler').default;                     // Destiny 2 API wrapper
//traveler helpers/classes/enums
const Enums = require('the-traveler/build/enums');                  // Get type enums for the-traveler wrapper
const Manifest = require('the-traveler/build/Manifest').default;
var profilesType = Enums.ComponentType.Profiles;                    // Access the-traveler enums
//Built-in requires
var fs = require('fs');
var os = require('os');                                             // OS info lib built into node for debugging

// Before the bot starts up, set up a traveler Manifest to query for data
const traveler = new Traveler({                                     // Must be defined before destinyManifest can be defined
    apikey: config.destiny2Token,
    userAgent: `Node ${process.version}`,                           // Used to identify your request to the API
    debug: true
});


var destinyManifest = createNewManifest();
const ver = '0.0.005';
/*
Notes:
IF A URL ISN'T WORKING TRY ENCODING IT ASDF

TODO: Create a really good middleware solution for the Destiny/Traveler API
TODO: Fix player search for PC not working
TODO: Clean up code
TODO: create config-template
*/

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.discordToken,
    autorun: true
});



bot.on('ready', function (evt) {                                    // Do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    console.log(`Bot version ${ver} started at ${new Date().toISOString()}`);
    bot.setPresence({                                               //make the bot 'play' soemthing
        idle_since: null,
        game: { name: 'Destiny 2' }
    });
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '%') {                           // Listen for messages that will start with `^`
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        // Log any messages sent to the bot to the console and to file for debugging
        fs.appendFileSync('discordMessagelog.log', `${user} sent: ${message} at ${Date.now()}`);
        console.log(`${user} sent: ${message} at ${new Date().toISOString()}`);
        args = args.splice(1);
        switch (cmd) {                                              // Bot needs to know if it will execute a command
            case 'help':                                            // Display the help file
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
            case 'searchplayer':
                let playerName = message.substring(14)
                searchForDestinyPlayerPC(playerName)
                    .then((playerData) => {
                        let embed = {
                            author: {
                                name: bot.username 
                            },
                            color: 3447003,
                            title: 'Player Info',
                            description: JSON.stringify(playerData)
                        }
                        if (playerData.Response.length > 0) {
                            bot.sendMessage({
                                to: channelID,
                                message: '',
                                embed: embed,
                                typing: true
                            });
                        } else {
                            bot.sendMessage({
                                to: channelID,
                                message: `${playerName} not found on Battle.net (Make sure you include the uniqueID)\nEX: playerName#1234`
                            });
                        }

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
                queryDestinyManifest('SELECT * FROM DestinyMilestoneDefinition')
                break;
            case 'clantest':
                getClanWeeklyRewardStateData()
                    .then((rewardData) => {
                        bot.sendMessage({
                            to: channelID,
                            message: JSON.stringify(rewardData, null, 2)
                        });
                    })
                break;
            // Just add any case commands here -- if you run into random crashes on bad commands, add a defualt handler
        }
    }
});

function searchForDestinyPlayerPC(playerArg) {
    let encodedPlayerArg = encodeURIComponent(playerArg)
    return traveler
        .searchDestinyPlayer('4', encodedPlayerArg)
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

function queryTest() {
    traveler.getDestinyManifest().then(result => {
        traveler.downloadManifest(result.Response.mobileWorldContentPaths.en, './manifest.content').then(filepath => {
            const manifest = new Manifest(filepath);
            manifest.queryManifest('SELECT * FROM DestinyMilestoneDefinition').then(queryResult => {
                console.log(queryResult);
            }).catch(err => {
                console.log(err);
            });
        }).catch(err => {
            console.log(err);
        })
    })
}

//create a Manifest instance to query for D2 data within the DB (super janky)
function createNewManifest() {
    traveler.getDestinyManifest().then(result => {
        traveler.downloadManifest(result.Response.mobileWorldContentPaths.en, './manifest.content').then(filepath => {
            return new Manifest(filepath);
        }).catch(err => {
            console.log(err);
        })
    })
}


function queryDestinyManifest(query) {
    destinyManifest.queryManifest(query).then(queryResult => {
        console.log(queryResult);
    }).catch(err => {
        console.log(err);
    });
}

function getClanWeeklyRewardStateData() {
    return traveler.getClanWeeklyRewardState(config.destiny2ClanID)
        .then((data) => {
            console.log(data.Response.rewards[0].entries);
            return data.Response.rewards;
        })
}
