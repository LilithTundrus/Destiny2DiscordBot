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

//TODO: make this take in the array of values [itemSlot, weaponClass, weapon??]
exports.getWeaponType = function (weaponHash) {
    if (weaponHash == 2) {
        return 'Kinetic Weapon';
    } else if (weaponHash == 3) {
        return 'Energy Weapon';
    } else if (weaponHash == 4) {
        return 'Power Weapon';
    }
}

exports.getWeaponDamageType = function (damageType) {
    if (damageType == 0) {
        return 'Armor';
    } else if (damageType == 1) {
        return 'Kinetic';
    } else if (damageType == 2) {
        return 'Arc';
    } else if (damageType == 3) {
        return 'Thermal';
    } else if (damageType == 4) {
        return 'Void';
    } else if (damageType == 5) {
        return 'Raid';
    } else {
        return 'Unknown'
    }
}