// Require configuration file
const cfg = require("./config.json");

// Attempt to require credentials file, which is not included in the repository
var credentials;
try
{
    credentials = require("./credentials.json");
}
catch
{
    console.log("Missing credentials.json");
    process.exit(1);
}

// Require discord.js
const Discord = require("discord.js");

// Instantiate a new client
const client = new Discord.Client();

// Sends a message, safely
function sendMessage(channel, message)
{
    channel.send(message)
        .catch(err => {
            console.log("Failed to send message: " + err);
        });
}

// Returns the first voice channel named "jail"
function getJailChannel(guild)
{
    var jailChannel = guild.channels.find(channel => channel.type === "voice" && channel.name.toLowerCase() === "prison");
    return jailChannel;
}

// Checks if anybody should be moved to the jail
function jailCheck(guild)
{
    guild.members.forEach(member => {
        if(typeof member.voiceChannel !== "undefined" && member.voiceChannel.name.toLowerCase() !== getJailChannel(guild))
        {
            member.setVoiceChannel(getJailChannel(guild))
                .catch(err => {
                    console.log("Failed to move member: " + err);
                });
        }
    });
}

// Quit process on warnings
process.on("warning", function(warn){
    process.exit(1);
});

// On client ready
client.on("ready", function(){
    console.log("Bot online!");
})

// Message event listener
client.on("message", async function(msg){

    // Ignore the message if it wasn't in a server text channel,
    // sent by a bot, or doesn't start with the prefix
    if(msg.channel.type !== "text") return;
    if(msg.author.bot) return;
    if(!msg.content.startsWith(cfg.prefix)) return;

    // Removes the prefix and leading/trailing whitespace and puts the command message into a string[]
    const args = msg.content.slice(cfg.prefix.length).trim().split(/ +/g);
    // Removes the first word of the arguments and puts it into a separate string
    const cmd = args.shift().toLowerCase();

    // HELP COMMAND
    if(cmd === "help")
    {
        var output = "";
        output += "Hello! My commands are as follows:\n";
        output += "```\n";
        
        cfg.commands.forEach(element => {
            output += `${cfg.prefix}${element.name} - ${element.desc}\n`;
        });

        output += "```\n";

        sendMessage(msg.channel, output);
    }

    else if(cmd === "jail")
    {
        // First, verify if a valid user was mentioned
        var member = msg.mentions.members.first();
        if(typeof member === "undefined")
        {
            sendMessage(msg.channel, "You must mention a valid user!");
            return;
        }

        // Verify that the guild does have a role named "jailed"
        var jailedRole = msg.guild.roles.find(role => role.name.toLowerCase() === "prisonnier");
        if(jailedRole === null)
        {
            sendMessage(msg.channel, "This guild does not have a \"Jailed\" role!")
            return;
        }

        // Verify if bot has the permissions to punish this user accordingly
        if(!member.manageable)
        {
            sendMessage(msg.channel, "I don't have the permissions necessary to punish this member!");
            return;
        }

        // Remove all their roles
        member.roles.forEach(role => {
            member.removeRole(role.id)
                .catch(err => {
                    console.log("Failed to remove role: " + err);
                });
        });

        // Give them the jailed role
        member.addRole(jailedRole.id)
            .catch(err => {
                console.log("Failed to add role: " + err);
            });


        // Send the response message
        sendMessage(msg.channel, "Jailed " + member.displayName + "!");

        // Immediately do a check to see if the member should be moved to the jail
        jailCheck(msg.guild);
    }
});

// Whenever anyone switches channels, perform a jail check
client.on("voiceStateUpdate", function(o, n){
    jailCheck(n.guild);
});

// Login to the Discord API
client.login(credentials.discordToken);