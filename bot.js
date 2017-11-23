'use strict';                                                       // Allow less 'bad' code
// Custom requires/libs
const config = require('./config.js');                              // Conifg/auth data
const dsTemplates = require('./lib/dsTemplates.js');                // Templates for Discord messages
const enumHelper = require('./lib/enumsAbstractor.js');             // Helper to get string values of the-traveler enums (common ones anyway)
const constants = require('./lib/constants.js')
// npm packages
var Discord = require('discord.io');                                // Discord API wrapper
var Traveler = require('the-traveler').default;                     // Destiny 2 API wrapper
var chalk = require('chalk');                                       // Console.logging colors!
// traveler helpers/classes/enums
const Enums = require('the-traveler/build/enums');                  // Get type enums for the-traveler wrapper
const Manifest = require('the-traveler/build/Manifest').default;    // Used for creating  D2 DB manifests
const profilesType = Enums.ComponentType.Profiles;                  // Access the-traveler enums
//Built-in requires
var fs = require('fs');                                             // Used for logging in the context of this bot
var os = require('os');                                             // OS info lib built into node for debugging
// Before the bot starts up, set up the-traveler and a D2 Manifest to query for data
const traveler = new Traveler({                                     // Must be defined before destinyManifest can be defined
    apikey: config.destiny2Token,
    userAgent: `Node ${process.version}`,                           // Used to identify your request to the API
    debug: true
});
// Init the Destiny 2 DB to call for hash IDs on items/basically anything hased
var destinyManifest;
// Refresh the manifest every 3 hours
setInterval(refreshManifest, 3 * 60 * 60 * 1000);
// Other declarations
const destiny2BaseURL = config.destiny2BaseURL;                     // Base URL for getting things like emblems for characters
const ver = '0.0.137';                                              // Arbitrary version for knowing which bot version is deployed

/*
Notes:
- IF A URL ISN'T WORKING TRY ENCODING IT ASDFGHJKL;'
- Current design goal is PC ONLY
- Region comments should work in atom/VSCode
- For the D2 DB you NEED to use the HASHES of the item to find it not the row ID!!!
- Trying to render characters is too hard (for now)

//TODO: figure out proper way to do Oauth (look at spirit's code) 
//TODO: create a !stats pve and !stats pvp command
//TODO: parse more data from the extra component endpoints in enum ComponentType
//TODO: set up bot DB for player/clan rosters
//TODO: create a hash decoder function for the DB (promise based)
//TODO: move help commands to a JSON array file
//TODO: allow for help <command> to get more info on a command
//TODO: error handle all exceptions
//TODO: group together like perks/traits in item searches
//TODO: add an admin list for the bot for live maitenance tasks
//TODO: clean up github page
//TODO: integrate py code for paginating
//TODO: use oauth for a 'my milestones' command
//TODO: Make sure Xur stuff is working
//TODO: add a way for player to add nicknames for their battletags (easier searching)
//TODO: allow players to register with their both for the profile command to give them
their profile by default
*/
var bot = new Discord.Client({                                      // Initialize Discord Bot with config.token
    token: config.discordToken,
    autorun: true
});

bot.on('ready', function (evt) {                                    // Do some logging and start ensure bot is running
    console.log('Connected to Discord...');
    console.log(`Logged in as: ${bot.username} - (${bot.id})`);
    console.log(`Bot version ${ver} started at ${new Date().toISOString()}`);
    refreshManifest();                                              // Refresh the Destiny manifest data    
    bot.setPresence({                                               // Make the bot 'play' soemthing
        idle_since: null,                                           // Set this to Date.now() to make the bot appear as away
        game: { name: 'Destiny 2' }
    });
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 1) == '%') {                           // Listen for messages that will start with `^`
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        // Log any messages sent to the bot to the console and to file for debugging
        fs.appendFileSync('discordMessagelog.log', `\n${user} sent: ${message} at ${Date.now()}`);
        console.log(`${user} sent: ${message} at ${new Date().toISOString()}`);
        args = args.splice(1);
        switch (cmd) {                                              // Bot needs to know if it will execute a command
            case 'help':                                            // Display the help file
                return help(channelID);
                break;
            case 'about':                                           // Display info about the bot
                return about(channelID);
                break;
            case 'searchplayer':                                    // Mostly for debugging
                if (message.length < 14 || message.trim().length < 14) {
                    let errDescription = `Please give a player tag to search for`;
                    return sendErrMessage(channelID, errDescription);
                } else {
                    let playerName = message.substring(14);
                    return searchplayer(channelID, playerName);
                }
                break;
            case 'profile':                                         // Use level 1 D2 API data to get a player's profile
                if (message.length < 9 || message.trim().length < 9) {
                    let errDescription = `Please provide a player name to search for`;
                    return sendErrMessage(channelID, errDescription);
                } else {
                    let playerName = message.substring(9);
                    return getProfile(channelID, playerName);
                }
                break;
            case 'nightfall':                                       // Get the Nightfall data
                return nightfalls(channelID);
                break;
            case 'item':
                if (message.length < 9 || message.trim().length < 9) {
                    let errDescription = `Please provide an argument at least 3 characters long`;
                    sendErrMessage(channelID, errDescription)
                } else {
                    let itemQuery = message.substring(6);
                    itemSearch(channelID, itemQuery);
                }
                break;
            case 'xur':
                return getXurData(channelID);
                break;
            // Just add any case commands here
        }
    }
});

// #region discordMessageFunctions
function about(channelIDArg) {                                      // Send the bot about message
    let aboutEmbed = new dsTemplates.baseDiscordEmbed;               // Set up embed message
    aboutEmbed.author = { name: bot.username, icon_url: config.travelerIcon };
    aboutEmbed.color = 3447003;
    aboutEmbed.title = `${bot.username} v${ver}`;
    aboutEmbed.description = `Info about this bot!\n[Invite this bot to your server](${config.discordInviteLink})`
        + '\n\nThe Traveler is a bot writtin in Node (ES6) to display useful info about the Destiny 2 from the D2 API endpoints';
    aboutEmbed.fields =
        [
            {
                name: 'Process Info',
                // CPU load average only works on unix/linux host 
                value: `RAM Total: ${Math.round(os.totalmem() / 1024 / 1024)}MB\nRAM free: ${Math.round(os.freemem() / 1024 / 1024)}MB\nIn use by Bot: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB\nCPU load: ${os.loadavg()[0]}%^`,
                inline: true
            },
            {
                name: 'Uptime',
                value: formatTime(process.uptime()),
                inline: true
            },
        ];
    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: aboutEmbed,
        typing: true
    });
}

function help(channelIDArg) {                                       // Help message as a function due to it needing to be repeatedly called
    let helpMsg = fs.readFileSync('./helpNotes.txt');
    var helpEmbed = new dsTemplates.baseDiscordEmbed;               // Set up embed message
    helpEmbed.title = '**Available Commands**';
    helpEmbed.description = helpMsg.toString();                     // Discord needs a string
    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: helpEmbed,
        typing: true
    });
}

/**
 * Search for a player using the D2 API and send a Discord message based on the results
 * @param {string|number} channelIDArg 
 * @param {string} playerName 
 * @returns {Promise}
 */
function searchplayer(channelIDArg, playerName) {
    return searchForDestinyPlayerPC(playerName)
        .then((playerData) => {
            if (playerData.Response[0]) {
                var playerID = playerData.Response[0].membershipId.toString();
                return getPlayerProfile(playerID)                   // Get the extra stuff like their icon
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
                                name: 'Most recent character light level:',
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
            return sendErrMessage(channelIDArg, err)
        });
}

/**
 * Get a profile of the most recent character played by a battle.net accunt if it exists
 * (abstracts a lot of related but separate API and DB calls)
 * 
 * TODO: get this to actually re-call the DB and get the correct weapons type per slot
 * rather than just *hoping* the order stays the same or doesn't break
 * 
 * TODO: get light level of each item based on their instance hash
 * 
 * TODO: get the damage type of weapons (less jankily)
 * @param {string|number} channelIDArg 
 * @param {string} playerName 
 * @returns {Promise}
 */
function getProfile(channelIDArg, playerName) {
    return searchForDestinyPlayerPC(playerName)                     // Find the player's ID (by name)
        .then((playerData) => {
            //set up vars to assign with data later
            var playerEquipMentArray = [];
            var playerWeaponEnergyTypes = [];
            var playerID;
            var playerEmblemURL;
            var playerLightLevel;
            var playerLevel;
            var playerGender;
            var playerRace;
            var playerClass;
            var playerTimePlayed;
            var playerLastPlayedDate;
            var playerLastOnline;
            if (playerData.Response[0]) {
                playerID = playerData.Response[0].membershipId.toString();
                return getMostRecentPlayedCharID(playerID)          // Get the extra stuff like their icon
                    .then((characterID) => {
                        console.log('PC Recent player call finished..');
                        console.log(characterID);
                        return getCharacterDataPC(playerID, characterID)    // Get character data with the ID
                            .then((characterData) => {
                                var promiseTail = Promise.resolve();
                                console.log('Got character data by ID');
                                console.log(characterData);
                                //characterData.data contains things like light level/etc.
                                playerEmblemURL = destiny2BaseURL + characterData.character.data.emblemPath;
                                playerLightLevel = characterData.character.data.light;
                                playerLevel = characterData.character.data.baseCharacterLevel;
                                playerGender = enumHelper.getDestinyGenderString(characterData.character.data.genderType);
                                playerRace = enumHelper.getDestinyRaceString(characterData.character.data.raceType);
                                playerClass = enumHelper.getDestinyClassString(characterData.character.data.classType);
                                playerTimePlayed = convertMinsToHrsMins(characterData.character.data.minutesPlayedTotal);
                                let lastPlayedDate = new Date(characterData.character.data.dateLastPlayed);
                                playerLastOnline = timeDifference(Date.now(), lastPlayedDate);
                                console.log(characterData.equipment.data);
                                //resolve equipment by hash 
                                characterData.equipment.data.items.forEach((item, index) => {
                                    promiseTail = promiseTail.then(() => {
                                        //chain the queries together
                                        return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyInventoryItemDefinition WHERE json LIKE '%"hash":${item.itemHash}%'  ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
                                            .then((queryData) => {
                                                //searching by hash should only return one value
                                                //TODO: sanity check this
                                                let itemData = JSON.parse(queryData[0].json);
                                                console.log(itemData.displayProperties.name);
                                                console.log(itemData.defaultDamageType);
                                                playerEquipMentArray.push(itemData.displayProperties.name);
                                                //if NOT armor or Kinetic
                                                if (itemData.defaultDamageType !== 0 && itemData.defaultDamageType !== 1) {
                                                    let damageType = enumHelper.getWeaponDamageType(itemData.defaultDamageType);
                                                    playerWeaponEnergyTypes.push(damageType);
                                                }
                                            })
                                    })
                                });
                                return promiseTail;
                            })
                            .then(() => {
                                // Piece together and send the message
                                var playerProfileEmbed = new dsTemplates.baseDiscordEmbed;
                                playerProfileEmbed.author = {
                                    name: playerData.Response[0].displayName,
                                    icon_url: 'http://i.imgur.com/tZvXxcu.png'
                                }
                                playerProfileEmbed.title = `Most recently played character for ${playerData.Response[0].displayName}`;
                                playerProfileEmbed.description = `Level ${playerLevel} ${playerRace} ${playerGender} ${playerClass} | :diamond_shape_with_a_dot_inside: ${playerLightLevel} Light`;
                                playerProfileEmbed.fields = [
                                    {
                                        name: 'Time played on character',
                                        value: playerTimePlayed,
                                        inline: true
                                    },
                                    {
                                        name: 'Last online',
                                        value: playerLastOnline,
                                        inline: true
                                    },
                                    {
                                        name: 'Weapons',
                                        value: `**Kinetic:** ${playerEquipMentArray[0]}\n**Energy:** ${playerEquipMentArray[1]} (${playerWeaponEnergyTypes[0]})\n**Power:** ${playerEquipMentArray[2]} (${playerWeaponEnergyTypes[1]})`,
                                        inline: true
                                    },
                                    {
                                        name: 'Armor',
                                        value: `**Head:** ${playerEquipMentArray[3]}\n**Arms:** ${playerEquipMentArray[4]}\n**Chest:** ${playerEquipMentArray[5]}\n**Legs:** ${playerEquipMentArray[6]}\n**Class Item:** ${playerEquipMentArray[7]}`,
                                        inline: true
                                    },
                                ];
                                playerProfileEmbed.thumbnail = {
                                    url: playerEmblemURL
                                };
                                bot.sendMessage({
                                    to: channelIDArg,
                                    message: '',
                                    embed: playerProfileEmbed,
                                    typing: true
                                });

                                console.log('Done.')
                            })
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
            return sendErrMessage(channelIDArg, err)
        })
}

function nightfalls(channelIDArg) {
    return getMilestonByHash('2171429505')
        .then((nightfallData) => {
            var nightfallEmbedTitle;
            var nightfallEmbedDescription;
            var nightfallEmbedIcon;
            var nightfallModifiersDecoded = [];
            var nightfallChallengesEncoded = [];
            var nightfallChallengesDecoded = [];
            // Get the base data
            return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyActivityDefinition WHERE json LIKE '%${nightfallData.availableQuests[0].activity.activityHash}%' ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
                .then((queryData) => {
                    // This query contains the nightfall description and name
                    let nightfallQueryData = JSON.parse(queryData[0].json);
                    console.log(nightfallQueryData);
                    nightfallEmbedTitle = nightfallQueryData.displayProperties.name;
                    nightfallEmbedDescription = nightfallQueryData.displayProperties.description;
                    nightfallEmbedIcon = destiny2BaseURL + nightfallQueryData.displayProperties.icon;
                    // Get the challenge hashes from the DB
                    nightfallQueryData.challenges.forEach((challenge, index) => {
                        nightfallChallengesEncoded.push(challenge.objectiveHash);
                    })
                    console.log(nightfallChallengesEncoded);
                    // Decode the challenges
                    var promiseTail = Promise.resolve();
                    nightfallChallengesEncoded.forEach((challengeHash, index) => {
                        promiseTail = promiseTail.then(() => {
                            return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyObjectiveDefinition WHERE json LIKE '%${challengeHash}%' ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
                                .then((queryData) => {
                                    console.log(queryData);
                                    let challengeJSON = JSON.parse(queryData[0].json);
                                    var challenges = {};
                                    challenges.name = challengeJSON.displayProperties.name;
                                    challenges.description = challengeJSON.displayProperties.description;
                                    nightfallChallengesDecoded.push(challenges);
                                })

                            console.log(nightfallData.availableQuests[0].activity.modifierHashes)
                            //Decode the modifiers (their hashes are right in the nightfall milestone)

                        })
                    })
                    // Modifiers are already in the base nightfallData
                    nightfallData.availableQuests[0].activity.modifierHashes.forEach((entry, index) => {
                        promiseTail = promiseTail.then(() => {
                            return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyActivityModifierDefinition WHERE json LIKE '%${entry}%' ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
                                .then((queryData) => {
                                    let modifierJSON = JSON.parse(queryData[0].json);
                                    var modifier = {};
                                    modifier.name = modifierJSON.displayProperties.name;
                                    modifier.description = modifierJSON.displayProperties.description;
                                    nightfallModifiersDecoded.push(modifier);
                                })
                        })
                    })
                    return promiseTail;
                })
                .then(() => {
                    // Create date Objects to handle moving the true timestamps to human readable
                    let startDate = new Date(nightfallData.startDate).toDateString();
                    let endDate = new Date(nightfallData.endDate).toDateString();
                    // Format the challenges and modifiers to fit into a field value
                    let challenges = nightfallChallengesDecoded.map(function (elem) {
                        return '\n\n**' + elem.name + ':** \n' + elem.description;
                    }).join('  ');
                    let modifiers = nightfallModifiersDecoded.map(function (elem) {
                        return '\n\n**' + elem.name + ':** \n' + elem.description;
                    }).join('  ');
                    var nightfallEmbed = new dsTemplates.baseDiscordEmbed;
                    nightfallEmbed.title = nightfallEmbedTitle;
                    nightfallEmbed.description = `_${nightfallEmbedDescription}_`;
                    nightfallEmbed.fields = [
                        {
                            name: 'Start Date:',
                            value: `Starts: ${startDate}`,
                            inline: true
                        },
                        {
                            name: 'End Date:',
                            value: `Ends: ${endDate}`,
                            inline: true
                        },
                        {
                            name: 'Modifiers:',
                            value: `${modifiers}`,
                            inline: false
                        },
                        {
                            name: 'Challenges:',
                            value: `${challenges}`,
                            inline: false
                        },
                    ]
                    nightfallEmbed.thumbnail = {
                        url: nightfallEmbedIcon
                    };
                    return bot.sendMessage({
                        to: channelIDArg,
                        message: '',
                        embed: nightfallEmbed,
                        typing: true
                    });
                })
        })
        .catch((err) => {
            return sendErrMessage(channelIDArg, err);
        })
}

function itemSearch(channelIDArg, itemQuery) {
    var itemTier;
    var itemType;
    var itemColor;
    var itemIconURL;
    var stats = [];
    var perks = [];
    var elementIconLocation;
    var itemJSON;
    return queryItemsByName(itemQuery)
        //TODO: confirm that the item isn't an emote or anything else until those are handled
        .then((queryData) => {
            if (queryData[0] == null) {                             // Make sure the DB carries a response
                throw new Error(`I couldn't find an item that contains ${itemQuery}`);
            } else if (queryData.length > 1) {
                throw new Error(`Pagination is not yet ready, try searching more specifically`);
            } else {
                itemJSON = JSON.parse(queryData[0].json);
                console.log(itemJSON);                              // Debugging
                itemTier = itemJSON.inventory.tierTypeName;
                itemType = itemJSON.itemTypeDisplayName;
                itemColor = constants.tierColors[itemTier];         // Get the tier type and assign the embed color based off that
                itemIconURL = destiny2BaseURL + itemJSON.displayProperties.icon;
                // Get non-item type specific data (socket stuff)
                var promiseTail = Promise.resolve();
                itemJSON.sockets.socketEntries.forEach((entry, index) => {
                    console.log(entry.reusablePlugItems)
                    entry.reusablePlugItems.forEach((item, itemIndex) => {
                        // TODO: Order perks by the same type (sights, etc.)
                        console.log()
                        promiseTail = promiseTail.then(() => {
                            return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyInventoryItemDefinition WHERE json LIKE '%"hash":${item.plugItemHash}%' ORDER BY json DESC LIMIT 0, 50000;`)
                                .then((socketQueryData) => {
                                    if (socketQueryData !== null) {
                                        let socketData = JSON.parse(socketQueryData[0].json)
                                        if (socketData.plug.plugCategoryIdentifier == 'shader') {
                                            return;                 // Skip shader slots
                                        } else if (socketData.itemTypeDisplayName == 'Weapon Ornament') {
                                            return;                 // Skip non-default ornaments
                                        } else if (socketData.plug.plugCategoryIdentifier == 'exotic_all_skins') {
                                            return;                 // Skip default ornaments
                                        }
                                        console.log(socketData);
                                        perks.push(
                                            {
                                                name: socketData.itemTypeDisplayName + ': ' + socketData.displayProperties.name,
                                                description: socketData.displayProperties.description
                                            })
                                    } else {
                                        console.log('NO QUERY DATA RETURNED... HANDLE THIS!!!')
                                    }
                                })
                        })

                    })

                })
                // Determine if weapon or armor by checking damage type, 0 being armor
                if (itemJSON.defaultDamageType == 0) {              // Armor type
                    // Decode stats
                    Object.keys(itemJSON.stats.stats).forEach(function (key) {
                        if (enumHelper.getArmorStatType(itemJSON.stats.stats[key].statHash) == 'Defense') {
                            // Get the min/max stats for defense
                            stats.push(`Defense: ${itemJSON.stats.stats[key].minimum}-${itemJSON.stats.stats[key].maximum}`)
                        } else if (enumHelper.getArmorStatType(itemJSON.stats.stats[key].statHash) == 'Unknown') {
                            return;                                     // Ignore the entry
                        } else {
                            stats.push(`${enumHelper.getArmorStatType(itemJSON.stats.stats[key].statHash)}: ${itemJSON.stats.stats[key].value}`)
                        }
                    });
                } else {                                            // Weapon type

                    // If element, set icon to the correct element
                    elementIconLocation = constants.elements[itemJSON.defaultDamageType]
                    Object.keys(itemJSON.stats.stats).forEach(function (key) {
                        // Decode the stats
                        if (enumHelper.getWeaponStatType(itemJSON.stats.stats[key].statHash) == 'Unknown') {
                            return;                                 // Do nothing for this item
                        } else if (enumHelper.getWeaponStatType(itemJSON.stats.stats[key].statHash) == 'Attack') {
                            stats.push(`Attack: ${itemJSON.stats.stats[key].minimum}-${itemJSON.stats.stats[key].maximum}`)
                            return;                                 // Disallow for re-push after first check
                        }
                        stats.push(`${enumHelper.getWeaponStatType(itemJSON.stats.stats[key].statHash)}: ${itemJSON.stats.stats[key].value}\u200B`)
                    });
                }
                return promiseTail;
            }
        })
        .then(() => {
            console.log('Done.');
            let itemEmbed = new dsTemplates.baseDiscordEmbed;
            itemEmbed.color = itemColor;
            itemEmbed.description = `_${itemJSON.displayProperties.description}_ `;
            itemEmbed.author = { name: itemJSON.displayProperties.name, icon_url: elementIconLocation };
            let statsEmbed = stats.map(function (elem) {
                return '\n' + elem + '\t';
            }).join('  ');
            itemEmbed.fields = [
                {
                    name: 'Stats',
                    value: statsEmbed,
                    inline: true
                },
            ];
            itemEmbed.thumbnail = {
                url: itemIconURL
            };
            perks.forEach((entry, index) => {
                itemEmbed.fields.push({
                    name: entry.name,
                    value: entry.description
                })
            });
            bot.sendMessage({
                to: channelIDArg,
                message: '',
                embed: itemEmbed,
                typing: true
            });
        })
        .catch((err) => {
            return sendErrMessage(channelIDArg, err)
        })
}

function getXurData(channelIDArg) {
    //for now just calculate his time-until-return
    return queryDestinyManifest(`SELECT _rowid_,* FROM DestinyVendorDefinition WHERE json LIKE '%xur%' ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
        .then((queryData) => {
            if (queryData[0] == null) {                                         // Check if the DB returned a response
                let errDescription = `I'm encountering an unknown error when trying to get Xur's data. Tray again later.`
                return sendErrMessage(channelIDArg, errDescription);
            } else {
                //Work with the data
                let xurData = JSON.parse(queryData[0].json);
                let xurIcon = config.destiny2BaseURL + xurData.displayProperties.icon;
                let xurBannerImage = config.destiny2BaseURL + xurData.displayProperties.largeIcon;
                // Get the reset offset and the reset interval
                // Set the offset to positive
                let xurResetOffsetMinutes = xurData.resetOffsetMinutes *= -1;
                let xurResetIntervalMinutes = xurData.resetIntervalMinutes;
                let xurVisitHrs = convertMinsToHrsMins(xurResetOffsetMinutes - xurResetIntervalMinutes)
                // Create the message embed
                var xurDataEmbed = new dsTemplates.baseDiscordEmbed;
                xurDataEmbed.title = `${xurData.displayProperties.name}: ${xurData.displayProperties.subtitle}`;
                xurDataEmbed.description = `_${xurData.displayProperties.description}_`;
                xurDataEmbed.fields = [
                    {
                        name: 'Time until next visit:',
                        value: `${xurVisitHrs}`
                    }
                ]
                xurDataEmbed.thumbnail = { url: xurIcon };
                xurDataEmbed.image = { url: xurBannerImage }
                return bot.sendMessage({
                    to: channelIDArg,
                    message: '',
                    embed: xurDataEmbed,
                    typing: true
                });
            }
        })
        .catch((err) => {
            return sendErrMessage(channelIDArg, err)
        })
}

function sendErrMessage(channelIDArg, err) {
    var messageEmbed = new dsTemplates.baseDiscordEmbed;
    messageEmbed.description = err.toString();
    messageEmbed.title = 'Error:';
    //add 'if you think this is a bug, contact me' to footnotes section
    bot.sendMessage({
        to: channelIDArg,
        message: '',
        embed: messageEmbed,
        typing: true
    });
    console.log(err);
    fs.appendFileSync('./logs/err.log', err)
}

// #endregion

// #region D2APIFunctions

/**
 * search for a Battle.net (PC) player name and return the Destiny 2 API Account/Player data.
 * @param {string} playerArg 
 * @returns {Promise}
 */
function searchForDestinyPlayerPC(playerArg) {
    let encodedPlayerArg = encodeURIComponent(playerArg);
    return traveler
        .searchDestinyPlayer('4', encodedPlayerArg)
        .then(player => {
            return player;                                          // For battle.net (PC) there should only ever be one player!
        }).catch(err => {
            console.log(err);
            return err;
        });
}

/**
 * Create an instanced DB of the D2 STANDARD Manifest to query
 * @returns {Promise}
 */
function createNewManifest() {
    var promiseTail = Promise.resolve();                            // Used to encapsulate all promise returns to called instance
    promiseTail = promiseTail
        .then(() => {
            return traveler.getDestinyManifest()
                .then(result => {
                    return traveler.downloadManifest(result.Response.mobileWorldContentPaths.en, './manifest.content')
                        .then(filepath => {
                            return new Manifest(filepath);
                        })
                })
        })
        .catch(err => {
            console.log(err);
        });
    return promiseTail;
}

/**
 * Send a query to the D2 Manifest (SQLite syntax)
 * @param {string} query 
 * @returns {JSON | null}
 */
function queryDestinyManifest(query) {
    return destinyManifest.queryManifest(query)
        .then(queryResult => {
            return queryResult;
        }).catch(err => {
            console.log(err);
            return err;
        });
}

/**
 * Get a player's profile based on their ID
 * @param {number | string} destinyMembershipID 
 * @returns {JSON}
 */
function getPlayerProfile(destinyMembershipID) {
    return traveler.getProfile('4', destinyMembershipID, { components: [200, 201] })
        .then((profileData) => {
            var characterDataArray = [];
            Object.keys(profileData.Response.characters.data).forEach(function (key) {
                characterDataArray.push(profileData.Response.characters.data[key]);
            });
            return characterDataArray;
        })
        .catch((err) => {
            console.log(err);
        });
}

/**
 * TODO: make this more efficient 
 * 
 * Abstract sorting through player data and determining the most recently played character
 * @param {number | string} destinyMembershipID 
 * @returns {number}
 */
function getMostRecentPlayedCharID(destinyMembershipID) {
    return traveler.getProfile('4', destinyMembershipID, { components: [100, 200] })
        .then((profileData) => {
            // Set up variables to push/assign
            var mostRecentCharacterID = 0;
            var characterDataArray = [];
            var dateComparisonArray = [];
            Object.keys(profileData.Response.characters.data).forEach(function (key) {
                // Push the data from the key of the obj since we can directly reference it since they change
                characterDataArray.push(profileData.Response.characters.data[key]);
                dateComparisonArray.push({ MeasureDate: profileData.Response.characters.data[key].dateLastPlayed })
            });
            // Compare the character's last played dates to get the most rcent character
            var latestPlayedDate = getLatestDate(dateComparisonArray);
            characterDataArray.forEach((entry, index) => {
                if (entry.dateLastPlayed == latestPlayedDate) {
                    mostRecentCharacterID = entry.characterId;      // Assign the character data to the entry that contains the most recently played date
                } else {
                    return;                                         // Do nothing
                }
            });
            return mostRecentCharacterID;                          // Return the correct object
        })
        .catch((err) => {
            console.log(err);
        });
}

/**
 * get D2 Character data in an aggregated source
 * 
 * TODO: Update the components arg to the traveler to get more/less information
 * @param {any} destinyMembershipID 
 * @param {any} characterID 
 * @returns {Promise & JSON}
 */
function getCharacterDataPC(destinyMembershipID, characterID) {
    return traveler.getCharacter('4', destinyMembershipID, characterID, { components: [200, 201, 202, 203, 204, 205, 303] })
        .then((response) => {
            return response.Response;                                   //return the important data from the API call
        })
}

/**
 * Get a Destiny 2 milestone data by its hash
 * @param {number | string} hashArg 
 * @returns {Promise & JSON}
 */
function getMilestonByHash(hashArg) {
    return traveler.getPublicMilestones()                           // Call traveler getPublicMileStons as a promise
        .then((mileStoneData) => {
            return mileStoneData.Response[hashArg];
        })
        .catch((err) => {
            console.log(err);
        })
}

function refreshManifest() {
    return createNewManifest()
        .then((newDestinyManifest) => {
            console.log(chalk.bold('Manifest refreshed'));
            return destinyManifest = newDestinyManifest;                // Somewhat janky. Will do for now
        })
}

function queryItemsByName(nameQuery) {
    return destinyManifest.queryManifest(`SELECT _rowid_,* FROM DestinyInventoryItemDefinition WHERE json LIKE '%"name":"${nameQuery}%' ORDER BY _rowid_ ASC LIMIT 0, 50000;`)
        .then(queryResult => {
            return queryResult;
        })
        .catch(err => {
            console.log(err);
            return err;
        });
}

// #endregion

// #region miscFunctions

function formatTime(seconds) {                                      // Format process.uptime (or other UNIX long dates (probably))
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor(seconds % (60 * 60) / 60);
    var seconds = Math.floor(seconds % 60);
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

/**
 * Takes in an array of date and returns the most recent value of the passed dates
 * @param {Array} data 
 * @returns {string}
 */
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
    // Take latest
    var latest = sorted[0];
    return latest.original_str;
}

/**
 * Function takes in a minutes value and returns a string of X hours, X minutes
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
