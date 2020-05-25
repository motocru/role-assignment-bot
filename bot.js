/**Required packages and file imports */
const Discord = require('discord.js');
const {prefix, token} = require('./auth.json');
const config = require('./config.json');
const servers = require('./db/servers');
const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])\s*<@&[0-9]+>/gi;
const customRegex = /<:[\w-]+:[0-9]+>\s*<@&[0-9]+>/gi;
const client = new Discord.Client();

client.once('ready', () => {
   console.log('Ready!');
});

client.login(token);

/**Sends a message to the first text based channel found with the important bot details */
client.on('guildCreate', guild => {
   let channel = undefined;
   let hasRoleChannel = false;
   let channels = guild.channels.cache;
   channels.forEach(c => {
      if (c.type === "text") {
         channel = c;
         if (c.name.toUpperCase() === "ROLES") {
            channel = c;
            hasRoleChannel = true;
         }
      }
   });
   channel.send(config.clMessages.joinMessage);
   if (!hasRoleChannel) {
      channel.send(`A text channel named 'roles' must be added to the sever for this bot to work properly`);
   }
})

/**Checks if a valid command message is made on the server and passes
 * it along to the commands if it is in fact valid
 */
client.on('message', message => {
   if (message.author.bot || message.channel.name.toUpperCase() !== "ROLES" || message.member.id !== message.guild.ownerID) return;
   if (/^rb!\w+/.test(message.content)) {
      BotCommands(message);
   } 
});

/**All messages with the command prefix are sent here */
function BotCommands(message) {
   var mess = message.content;
   var args = mess.substring(3).split(' ');
   var cmd = args[0].toUpperCase();

   switch(cmd) {
      case "HELP":
         message.channel.send(config.clMessages.help);
         break;
      case "ROLEMESSAGE":
         message.channel.send('This will print out the emoji repsonse message again');
         //TODO: include code to assign the message in the database
         break;
      case "SETMESSAGE":
         var lines = message.content.split('\n');
         var roleAssociations = message.content.match(emojiRegex);
         var customAssociations = message.content.match(customRegex);
         if (!SetMessageVerification(lines, message, roleAssociations, customAssociations)) {
            break;
         }
         //TODO: include code to insert a server record in the database with this message number
         break;
      case "TEST":
         var roleAssociations = message.content.match(emojiRegex);
         var customAssociations = message.content.match(customRegex);
         console.log(message.content);
         var customName = customAssociations[0].match(/:[\w-]+:/gi);
         customName = customName[0].replace(/:/gi, '');
         customName = message.guild.emojis.cache.find(emoji => emoji.name === customName);
         console.log(customName);
         break;
      default:
         message.channel.send('Unknown command, try using: **rb!help**');
         break;
   }
}

/**adds or removes users from roles specified in a server */
function RoleAssignment(choice, desiredRole, message) {
   let role = message.guild.roles.cache.find(r => r.name === desiredRole);
   if (role === undefined) {
      message.channel.send(`The role: '${desiredRole}' does not exist on this server.\n Use **rb!roles** to display available roles`);
      return;
   }
   if (choice === 'add') {
      if (HasRole(message.member, desiredRole)) {
         message.channel.send(`You are already a memeber of the '${desiredRole}' role`);
         return;
      }
      message.member.roles.add(role).catch(console.error)
      .then(res => {
         if (res === undefined) message.channel.send('There was an error in adding you to the specified role');
         else message.channel.send(`You have been added to the '${desiredRole}' role`);
      });
   }  else {
      if (!HasRole(message.member, desiredRole)) {
         message.channel.send(`You cannot to remove yourself from '${desiredRole}' as you are not a member`);
         return;
      }
      message.member.roles.remove(role).catch(console.error)
      .then(res => {
         if (res === undefined) message.channel.send('There was an error in removing you from the specified role');
         else message.channel.send(`You have been removed from the '${desiredRole}' role`);
      });
   }
}

/**verifies the rb!setmessage command has the correct format and will try to print out tailored error messages
 * based on what is found to be wrong with it
 */
function SetMessageVerification(lines, message, roleAssociations, customAssociations) {
   if (!Line1SetMessageVerification(lines[0].split(' '))) {
      message.channel.send(`${config.clMessages.formatMessage}\n${config.clMessages.correctFormatExample}`);
      return false;
   }
   if (lines.length < 2 || (roleAssociations === null && customAssociations === null)) {
      message.channel.send(`${config.clMessages.minReqMessage}\n${config.clMessages.correctFormatExample}`);
      return false;
   }
   if (customAssociations !== null) {
      for (var i = 0; i < customAssociations.length; i++) {
         var emoji = customAssociations[i];
         emoji = emoji.match(/:[\w-]+:/gi);
         emoji = emoji[0].replace(/:/gi, '');
         emoji = message.guild.emojis.cache.find(e => e.name === emoji);
         if (emoji.animated || emoji.deleted) {
            message.channel.send(`${config.clMessages.animatedMessage}`);
            return false;
         }
      }
   }
   return true;
}

/**returns true or false based on the correctnessof the first line */
function Line1SetMessageVerification(line1) {
   if (line1.length < 3) return false;
   if (line1[1].toUpperCase() !== "CHOOSE") return false;
   if (line1[2].toUpperCase() !== "ANY" || line1[2].toUpperCase() !== "ONE") return false;
   else return true;
}

/**Determines if a user is already in a specified role */
function HasRole(member, role) {
   let hasRole = member.roles.cache.find(r => r.name === role);
   return (hasRole === undefined) ? false : true;
}