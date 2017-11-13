//Abstract the D2 enums as strings
const Enums = require('the-traveler/build/enums');                  // Get type enums for the-traveler wrapper


exports.getDestinyGenderString = function (genderEnum) {
    if (genderEnum == Enums.DestinyGender.Male) {
        return 'Male';
    } else if (genderEnum == Enums.DestinyGender.Female) {
        return 'Female';
    } else {
        return 'Unknown';
    }
}

exports.getDestinyClassString = function (classEnum) {
    if (classEnum == Enums.DestinyClass.Titan) {
        return 'Titan';
    } else if (classEnum == Enums.DestinyClass.Hunter) {
        return 'Hunter';
    } else if (classEnum == Enums.DestinyClass.Warlock) {
        return 'Warlock';
    } else {
        return 'Unknown';
    }
}

exports.getDestinyRaceString = function (raceEnum) {
    if (raceEnum == Enums.DestinyRace.Human) {
        return 'Human';
    } else if (raceEnum == Enums.DestinyRace.Awoken) {
        return 'Awoken';
    } else if (raceEnum == Enums.DestinyRace.Exo) {
        return 'Exo';
    } else {
        return 'Unknown'
    }
}

exports.getDestinyBucketHashString = function (bucketEnum) {
    if (bucketEnum == 1498876634) {
        return 'Kinetic Weapon';
    } else if (bucketEnum == 953998645)
        return 'Power Weapon';
}
