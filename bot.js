'use strict';                                                       // Allow less 'bad' code
//custom requires/libs
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
// Before the bot starts up, set up the-traveler and a D2 Manifest to query for data
const traveler = new Traveler({                                     // Must be defined before destinyManifest can be defined
    apikey: config.destiny2Token,
    userAgent: `Node ${process.version}`,                           // Used to identify your request to the API
    debug: true
});
//This doesn't work just yet
var destinyManifest = createNewManifest();
//other declarations
const destiny2BaseURL = config.destiny2BaseURL;                     // Base URL for getting things like emblems for characters
const ver = '0.0.007';                                              // Arbitrary version for knowing which bot version is deployed
/*
Notes:
- IF A URL ISN'T WORKING TRY ENCODING IT ASDFGHJKL;'
- Current design goal is PC ONLY
- Do everything that doesn't involve the DB first!
- Region comments should work in atom/VSCode

TODO: Create a really good middleware solution for the Destiny/Traveler API
TODO: Clean up janky code
TODO: create config-template
TODO: clean up currently working components and outline what they do
TODO: make the embed template a class!
TODO: fix declare organizations
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

//embed message template
var baseDiscordEmbed = {
    author: {
        name: bot.username,
        icon_url: config.travelerIcon
    },
    color: 3447003,
    title: '',
    description: '',
};

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '%') {                           // Listen for messages that will start with `^`
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        // Log any messages sent to the bot to the console and to file for debugging
        fs.appendFileSync('discordMessagelog.log', `${user} sent: ${message} at ${Date.now()}`);
        console.log(`${user} sent: ${message} at ${new Date().toISOString()}`);
        args = args.splice(1);
        switch (cmd) {                                              // Bot needs to know if it will execute a command
            //make all of these an embed
            case 'help':                                            // Display the help file
                return help(channelID);
                break;
            case 'about':
                return about(channelID);
                break;
            case 'searchplayer':
                let playerName = message.substring(14);
                //check for an actual arg
                return searchForDestinyPlayerPC(playerName)
                    .then((playerData) => {
                        if (playerData.Response[0]) {
                            var playerID = playerData.Response[0].membershipId.toString();
                            //get the extra stuff like their icon
                            return getPlayerProfile(playerID)
                                .then((playerCharData) => {
                                    var emblemURL = destiny2BaseURL + playerCharData[0].emblemPath;
                                    var lightLevel = playerCharData[0].light
                                    var embed = {
                                        author: {
                                            name: playerData.Response[0].displayName,
                                            icon_url: 'http://i.imgur.com/tZvXxcu.png'
                                        },
                                        color: 3447003,
                                        title: 'Account/Player Info',
                                        description: 'All current available account info from search endpoint',
                                        fields: [
                                            {
                                                name: '\nPlayer ID',
                                                value: playerData.Response[0].membershipId,
                                                inline: true
                                            },
                                            {
                                                name: 'Display Name',
                                                value: playerData.Response[0].displayName,
                                                inline: true
                                            },
                                            {
                                                name: 'Account type',
                                                value: 'PC',
                                                inline: true
                                            },
                                            {
                                                name: 'Most recent character light level (Alpha testing):',
                                                value: lightLevel,
                                                inline: true
                                            },
                                        ],
                                        thumbnail: {
                                            url: emblemURL
                                        },
                                    };
                                    bot.sendMessage({
                                        to: channelID,
                                        message: '',
                                        embed: embed,
                                        typing: true
                                    });
                                })
                                .catch((err) => {
                                    console.log(err);
                                });
                        } else {
                            //put an embed here as well!
                            let messageEmbed = baseDiscordEmbed;
                            messageEmbed.description = `**${playerName}** not found on Battle.net (Make sure you include the uniqueID)\nEX: playerName#1234`;
                            messageEmbed.title = 'Error:';
                            bot.sendMessage({
                                to: channelID,
                                message: '',
                                embed: messageEmbed,
                                typing: true
                            });
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
                break;
            case 'ms':
                getMileStones()
                    .then(mileStones => {
                        bot.sendMessage({
                            to: channelID,
                            message: mileStones
                        });
                    });
                break;
            case 'manifest':
                queryDestinyManifest('SELECT * FROM DestinyMilestoneDefinition');
                break;
            case 'clantest':
                getClanWeeklyRewardStateData()
                    .then((rewardData) => {
                        bot.sendMessage({
                            to: channelID,
                            message: JSON.stringify(rewardData, null, 2)
                        });
                    });
                break;
            // Just add any case commands here -- if you run into random crashes on bad commands, add a defualt handler
        }
    }
});

// #region discordMessageFunctions
function about(channelIDArg) {                                           // Send the bot about message
    //set up embed message
    let aboutEmbed = baseDiscordEmbed;
    aboutEmbed.author = { name: bot.username, icon_url: config.travelerIcon };
    aboutEmbed.color = 3447003;
    aboutEmbed.title = `${bot.username} ${ver}`;
    aboutEmbed.description = 'Info about this bot!\n--Invite this bot to your server--';
    aboutEmbed.fields =
        [{
            name: 'Process Info',
            //CPU load average only works on unix/linux host 
            value: `RAM Total: ${Math.round(os.totalmem() / 1024 / 1024)}MB\nRAM free: ${Math.round(os.freemem() / 1024 / 1024)}MB\nIn use by Bot: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB\nCPU load: ${os.loadavg()[0]}%^`,
            inline: true
        },
        {
            name: 'Uptime',
            value: formatTime(process.uptime()),
            inline: true
        },
        {
            name: 'PH',
            value: 'PH',
            inline: true
        },
        {
            name: 'PH',
            value: 'PH',
            inline: true
        },];

    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: aboutEmbed,
        typing: true
    });
}

function help(channelIDArg) {                                           // Help message as a function due to it needing to be repeatedly called
    let helpMsg = fs.readFileSync('./helpNotes.txt');
    //set up embed message
    var helpEmbed = baseDiscordEmbed;
    helpEmbed.title = '**Available Commands**';
    let helpString = 'For additional help go to https://github.com/LilithTundrus/Destiny2DiscordBot\n\n';
    helpEmbed.description = helpString + helpMsg.toString();
    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: helpEmbed,
        typing: true
    });
}

// #endregion

// #region D2APIFunctions

/**
 * search for a Battle.net (PC) player name and return the Destiny 2 API Account/Player data.
 * 
 * @param {string} playerArg 
 * @returns {Promise}
 */
function searchForDestinyPlayerPC(playerArg) {
    let encodedPlayerArg = encodeURIComponent(playerArg);
    return traveler
        .searchDestinyPlayer('4', encodedPlayerArg)
        .then(player => {
            console.log(player);
            return player;                                          // For battle.net (PC) there should only ever be one player!
        }).catch(err => {
            console.log(err);
            return err;
        });
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
                console.log('\n' + key);
                //once we have the hash(key) we can call the getMileStoneContent to get the rest of the data
                return traveler.getPublicMilestoneContent(key)
                    .then(mileStoneData => {
                        console.log(mileStoneData.Response);
                    });
            });
            return JSON.stringify(data.Response).substring(0, 1000);
        })
        .catch(err => {
            console.log(err);
        });
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
        });
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
        });
    });
}

//create a Manifest instance to query for D2 data within the DB (super janky)
function createNewManifest() {
    traveler.getDestinyManifest().then(result => {
        traveler.downloadManifest(result.Response.mobileWorldContentPaths.en, './manifest.content').then(filepath => {
            return new Manifest(filepath);
        }).catch(err => {
            console.log(err);
        });
    });
}

//Not yet working/used
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
        });
}

function getPlayerProfile(destinyMembershipID) {
    return traveler.getProfile('4', destinyMembershipID, { components: [200, 201] })
        .then((profileData) => {
            console.log(profileData);
            var characterDataArray = [];
            Object.keys(profileData.Response.characters.data).forEach(function (key) {
                console.log('\n' + key);
                console.log(profileData.Response.characters.data[key])
                characterDataArray.push(profileData.Response.characters.data[key]);
            });
            return characterDataArray;
            //TODO: determine the most recently played character/number of characters
        })
        .catch((err) => {
            console.log(err);
        });
}
// #endregion

// #region miscFunctions

//format process.uptime (or other UNIX long dates (probably))
function formatTime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor(seconds % (60 * 60) / 60);
    var seconds = Math.floor(seconds % 60);
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// #endregion

