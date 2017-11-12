'use strict';                                                       // Allow less 'bad' code
//custom requires/libs
const config = require('./config.js');                              // Conifg/auth data
const dsTemplates = require('./dsTemplates.js');                    // Templates for Discord messages
const enumHelper = require('./lib/enumsAbstractor.js');             // Helper to get string values of the-traveler enums
//npm packages
var Discord = require('discord.io');                                // Discord API wrapper
var request = require('request');                                   // Used to make call to WF worldState
var Traveler = require('the-traveler').default;                     // Destiny 2 API wrapper
//traveler helpers/classes/enums
const Enums = require('the-traveler/build/enums');                  // Get type enums for the-traveler wrapper
const Manifest = require('the-traveler/build/Manifest').default;
var profilesType = Enums.ComponentType.Profiles;                    // Access the-traveler enums
//get character stat enums here

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
const ver = '0.0.008';                                              // Arbitrary version for knowing which bot version is deployed
/*
Notes:
- IF A URL ISN'T WORKING TRY ENCODING IT ASDFGHJKL;'
- Current design goal is PC ONLY
- Do everything that doesn't involve the DB first!
- Region comments should work in atom/VSCode

TODO: Create a really good middleware solution for the Destiny/Traveler API
TODO: init a DB (may be a while)
TODO: create config-template
TODO: clean up currently working components and outline what they do
TODO: fix declare organizations
TODO: figure out proper way to do Oauth (look at spirit's code)
TODO: fully extend enumHelper
TODO: move miscFunctions to /lib
TODO: parse more data from the extra component endpoints in enum ComponentType
*/

var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.discordToken,
    autorun: true
});

bot.on('ready', function (evt) {                                    // Do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    console.log(`Bot version ${ver} started at ${new Date().toISOString()}`);
    bot.setPresence({                                               // Make the bot 'play' soemthing
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
                return help(channelID);
                break;
            case 'about':
                return about(channelID);
                break;
            //mostly for debugging
            case 'searchplayer':
                if (message.length < 14 || message.trim().length < 14) {
                    var errMessageEmbed = new dsTemplates.baseDiscordEmbed;
                    errMessageEmbed.description = `Please provide an argument`;
                    errMessageEmbed.title = 'Error:';
                    bot.sendMessage({
                        to: channelID,
                        message: '',
                        embed: errMessageEmbed,
                        typing: true
                    });
                } else {
                    let playerName = message.substring(14);
                    return searchplayer(channelID, playerName);
                }
                break;
            case 'profile':
                if (message.length < 9 || message.trim().length < 9) {
                    var errMessageEmbed = new dsTemplates.baseDiscordEmbed;
                    errMessageEmbed.description = `Please provide an argument`;
                    errMessageEmbed.title = 'Error:';
                    bot.sendMessage({
                        to: channelID,
                        message: '',
                        embed: errMessageEmbed,
                        typing: true
                    });
                } else {
                    let playerName = message.substring(9);
                    return getProfile(channelID, playerName);
                }
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
            // Just add any case commands here
        }
    }
});

// #region discordMessageFunctions
function about(channelIDArg) {                                           // Send the bot about message
    //set up embed message
    let aboutEmbed = new dsTemplates.baseDiscordEmbed;
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
    var helpEmbed = new dsTemplates.baseDiscordEmbed;
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

/**
 * Search for a player using the D2 API and send a Discord message based on the results
 * 
 * @param {string|number} channelIDArg 
 * @param {string} playerName 
 * @returns {Promise}
 */
function searchplayer(channelIDArg, playerName) {
    return searchForDestinyPlayerPC(playerName)
        .then((playerData) => {
            if (playerData.Response[0]) {
                var playerID = playerData.Response[0].membershipId.toString();
                return getPlayerProfile(playerID)                                   // Get the extra stuff like their icon
                    .then((playerCharData) => {
                        var emblemURL = destiny2BaseURL + playerCharData[0].emblemPath;
                        var lightLevel = playerCharData[0].light
                        var searchPlayerEmbed = new dsTemplates.baseDiscordEmbed;
                        searchPlayerEmbed.author = {
                            name: playerData.Response[0].displayName,
                            icon_url: 'http://i.imgur.com/tZvXxcu.png'
                        }
                        searchPlayerEmbed.title = 'Account/Player Info';
                        searchPlayerEmbed.description = 'All current available account info from search endpoint';
                        searchPlayerEmbed.fields = [
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
                        ];
                        searchPlayerEmbed.thumbnail = {
                            url: emblemURL
                        };
                        bot.sendMessage({
                            to: channelIDArg,
                            message: '',
                            embed: searchPlayerEmbed,
                            typing: true
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            } else {
                var messageEmbed = new dsTemplates.baseDiscordEmbed;
                messageEmbed.description = `**${playerName}** not found on Battle.net (Make sure you include the uniqueID)\nEX: playerName#1234`;
                messageEmbed.title = 'Error:';
                bot.sendMessage({
                    to: channelIDArg,
                    message: '',
                    embed: messageEmbed,
                    typing: true
                });
            }
        })
        .catch((err) => {
            var messageEmbed = new dsTemplates.baseDiscordEmbed;
            messageEmbed.description = 'I seem to be having an unknown problem. Try again later.';
            messageEmbed.title = 'Error:';
            bot.sendMessage({
                to: channelIDArg,
                message: '',
                embed: messageEmbed,
                typing: true
            });
            console.log(err);
        });
}

/**
 * Get a profile of the most recent character played by a battle.net accunt if it exists
 * 
 * @param {string|number} channelIDArg 
 * @param {string} playerName 
 * @returns {Promise}
 */
function getProfile(channelIDArg, playerName) {
    return searchForDestinyPlayerPC(playerName)
        .then((playerData) => {
            if (playerData.Response[0]) {
                var playerID = playerData.Response[0].membershipId.toString();
                return getMostRecentPlayedCharPC(playerID)                                   // Get the extra stuff like their icon
                    .then((playerCharData) => {
                        //set up data and use enums to get coded data (Gender/Etc.)
                        var emblemURL = destiny2BaseURL + playerCharData.emblemPath;
                        var lightLevel = playerCharData.light;
                        let playerLevel = playerCharData.baseCharacterLevel;
                        let playerGender = enumHelper.getDestinyGenderString(playerCharData.genderType);
                        let playerClass = enumHelper.getDestinyClassString(playerCharData.classType);
                        let playerRace = enumHelper.getDestinyRaceString(playerCharData.raceType)
                        let timePlayed = convertMinsToHrsMins(playerCharData.minutesPlayedTotal);
                        let lastPlayedDate = new Date(playerCharData.dateLastPlayed);
                        let lastOnline = timeDifference(Date.now(), lastPlayedDate)
                        var searchPlayerEmbed = new dsTemplates.baseDiscordEmbed;
                        searchPlayerEmbed.author = {
                            name: playerData.Response[0].displayName,
                            icon_url: 'http://i.imgur.com/tZvXxcu.png'
                        }
                        searchPlayerEmbed.title = `Most recently played character for ${playerData.Response[0].displayName}`;
                        searchPlayerEmbed.description = `Level ${playerLevel} ${playerGender} ${playerClass} | :diamond_shape_with_a_dot_inside: ${lightLevel} Light`;
                        searchPlayerEmbed.fields = [
                            {
                                name: 'Race',
                                value: playerRace,
                                inline: true
                            },
                            {
                                name: 'Time played on character',
                                value: timePlayed,
                                inline: true
                            },
                            {
                                name: 'Last online',
                                value: lastOnline,
                                inline: true
                            },
                        ];
                        searchPlayerEmbed.thumbnail = {
                            url: emblemURL
                        };
                        bot.sendMessage({
                            to: channelIDArg,
                            message: '',
                            embed: searchPlayerEmbed,
                            typing: true
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            } else {
                var messageEmbed = new dsTemplates.baseDiscordEmbed;
                messageEmbed.description = `**${playerName}** not found on Battle.net (Make sure you include the uniqueID)\nEX: playerName#1234`;
                messageEmbed.title = 'Error:';
                bot.sendMessage({
                    to: channelIDArg,
                    message: '',
                    embed: messageEmbed,
                    typing: true
                });
            }
        })
        .catch((err) => {
            var messageEmbed = new dsTemplates.baseDiscordEmbed;
            messageEmbed.description = 'I seem to be having an unknown problem. Try again later.';
            messageEmbed.title = 'Error:';
            bot.sendMessage({
                to: channelIDArg,
                message: '',
                embed: messageEmbed,
                typing: true
            });
            console.log(err);
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
        })
        .catch((err) => {
            console.log(err);
        });
}

function getMostRecentPlayedCharPC(destinyMembershipID) {
    return traveler.getProfile('4', destinyMembershipID, { components: [200, 201, 202, 203, 204, 205, 303] })
        .then((profileData) => {
            console.log(profileData);
            var mostRecentCharacterObj;
            var characterDataArray = [];
            var dateComparisonArray = [];
            Object.keys(profileData.Response.characters.data).forEach(function (key) {
                console.log('\n' + key);
                console.log(profileData.Response.characters.data[key])
                characterDataArray.push(profileData.Response.characters.data[key]);
                dateComparisonArray.push({ MeasureDate: profileData.Response.characters.data[key].dateLastPlayed })
            });
            //this is bad but it's all I have for now..
            //compare the character's last played dates to get the most rcent character
            var latestPlayedDate = getLatestDate(dateComparisonArray);
            characterDataArray.forEach((entry, index) => {
                if (entry.dateLastPlayed == latestPlayedDate) {
                    console.log('\nGot most recent character...')
                    mostRecentCharacterObj = entry;
                }
            })
            return mostRecentCharacterObj;
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

function getLatestDate(data) {
    var sorted = data.map(function (item) {
        var MeasureDate = item.MeasureDate;
        return {
            original_str: MeasureDate,
            in_ms: (new Date(MeasureDate)).getTime()
        }
    }).sort(function (item1, item2) {
        return (item1.in_ms < item2.in_ms)
    });

    // take latest
    var latest = sorted[0];

    return latest.original_str;
}

/**
 * 
 * 
 * @param {number} mins 
 * @returns {string}
 */
function convertMinsToHrsMins(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? '0' + h : h;
    m = m < 10 ? '0' + m : m;
    return `${h} Hours ${m} Minutes`;
}

/**
 * 
 * Takes two dates to compare and return an X timeValue ago string (IE 3 months ago)
 * @param {Date} current 
 * @param {Date} previous 
 * @returns {string}
 */
function timeDifference(current, previous) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;
    var elapsed = current - previous;
    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' seconds ago';
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' minutes ago';
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours ago';
    } else if (elapsed < msPerMonth) {
        return 'approximately ' + Math.round(elapsed / msPerDay) + ' days ago';
    } else if (elapsed < msPerYear) {
        return 'approximately ' + Math.round(elapsed / msPerMonth) + ' months ago';
    } else {
        return 'approximately ' + Math.round(elapsed / msPerYear) + ' years ago';
    }
}
// #endregion

