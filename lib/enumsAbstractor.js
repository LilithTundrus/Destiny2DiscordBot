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
        return 'Unknown';
    }
}

exports.getArmorStatType = function (statHash) {
    if (statHash == 2996146975) {
        return 'Mobility';
    } else if (statHash == 392767087) {
        return 'Resilience';
    } else if (statHash == 1943323491) {
        return 'Recovery';
    } else if (statHash == 3897883278) {
        return 'Defense';
    } else {
        return 'Unknown';
    }
}
exports.getWeaponStatType = function (statHash) {
    if (statHash == 1480404414) {
        return 'Attack';
    } else if (statHash == 3871231066) {
        return 'Magazine';
    } else if (statHash == 4284893193) {
        return 'RPM';
    } else if (statHash == 2961396640) {
        return 'Charge time';
    } else if (statHash == 3614673599) {
        return 'Blast radius';
    } else if (statHash == 1345609583) {
        return 'Aim assist';
    } else if (statHash == 4043523819) {
        return 'Impact';
    } else if (statHash == 1240592695) {
        return 'Range';
    } else if (statHash == 155624089) {
        return 'Stability';
    } else if (statHash == 4188031367) {
        return 'Reload speed';
    } else if (statHash == 943549884) {
        return 'Handling';
    } else if (statHash == 2523465841) {
        return 'Valocity';
    } else {
        return 'Unknown';
    }
}