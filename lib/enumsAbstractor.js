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
