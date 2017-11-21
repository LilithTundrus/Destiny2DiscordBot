// You can always extend this class with fields/other Discord embed items but
// it will not show up in intellisense for this class. Only the defined properties here 
// will be
class baseDiscordEmbed {
    constructor() {
        this.author = {
            name: '',
            icon_url: ''
        };
        this.color = 3447003;
        this.title = '';
        this.description = '';
    }
}

exports.baseDiscordEmbed = baseDiscordEmbed