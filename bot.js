/**Required packages and file imports */
const Discord = require('discord.js');
const {prefix, token} = require('./auth.json');
const config = require('./config.json');
const messages = require('./db/messages');
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
         if (!c.deleted && channel === undefined) channel = c;
         if (c.name.toUpperCase() === "ROLES" && !c.deleted) {
            channel = c;
            hasRoleChannel = true;
         }
      }
   });
   var joiningMess = config.clMessages.joinMessage;
   if (!hasRoleChannel) {
      joiningMess += `\n\nA text channel named 'roles' must be added to the sever for this bot to work properly`;
   }
   channel.send(joiningMess);
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

/**Triggers when a user adds an emoji to a valid role message */
client.on('messageReactionAdd', (reaction, user) => {
   messages.getMessageById(reaction.message.id, function(storedMessage) {
      if (storedMessage === null) return;
      var message = IdentifiedMessage(reaction);
      if (message.deleted) return;
      var reactLine;
      if (reaction._emoji.id === null) reactLine = message.content.match(new RegExp(`${reaction._emoji.name}\\s*<@&[0-9]+>`, 'gi'));
      else reactLine = message.content.match(new RegExp(`<:${reaction._emoji.name}:${reaction._emoji.id}>\\s*<@&[0-9]+>`, 'gi'));
      if (reactLine === null) return;
      reactLine = reactLine[0].match(/<@&[0-9]+>/gi);
      reactLine = reactLine[0].replace(/[<@&>]/gi, '');
      RoleAssignment('add', reactLine, user);
   })
});

/**Triggers when a user removes an emoji from a valid role message */
client.on('messageReactionRemove', (reaction, user) => {
   var message_id = (reaction.message === undefined) ? reaction.message_id : reaction.message.id;
   messages.getMessageById(message_id, function(storedMessage) {
      if (storedMessage === null) return;
      var message = IdentifiedMessage(reaction);
      if (message.deleted) return;
      if (reaction._emoji === undefined) reaction._emoji = {name: reaction.name, id: reaction.id};
      var reactLine;
      if (reaction._emoji.id === null) reactLine = message.content.match(new RegExp(`${reaction._emoji.name}\\s*<@&[0-9]+>`, 'gi'));
      else reactLine = message.content.match(new RegExp(`<:${reaction._emoji.name}:${reaction._emoji.id}>\\s*<@&[0-9]+>`, 'gi'));
      if (reactLine === null) return;
      reactLine = reactLine[0].match(/<@&[0-9]+>/gi);
      reactLine = reactLine[0].replace(/[<@&>]/gi, '');
      RoleAssignment('remove', reactLine, user);
   });
});

/**This function is necessary to get messageReaction and messageReactionRemove to work on non-cached messages */
client.on('raw', packet => {
   //returns if the event is not a message reaction add or remove
   if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
   var channelPromise = client.channels.fetch(packet.d.channel_id);
   //console.log(packet.d);
   channelPromise.catch(console.error)
   .then(channel => {
      //Returns if the message is found in cache which means it will already trigger
      if (channel.messages.cache.get(packet.d.message_id) !== undefined) return;
      channel.messages.fetch(packet.d.message_id).catch(console.error)
      .then(message => {
         const emoji = packet.d.emoji.id ? packet.d.emoji.id : packet.d.emoji.name;
         const reaction = message.reactions.cache.get(emoji);
         client.users.fetch(packet.d.user_id, true).catch(console.error)
         .then(user => {
            if (packet.t === 'MESSAGE_REACTION_ADD') client.emit('messageReactionAdd', reaction, user);
            if (packet.t === 'MESSAGE_REACTION_REMOVE') {
               var reactionObj = packet.d.emoji;
               reactionObj.message_id = packet.d.message_id;
               reactionObj.channel_id = packet.d.channel_id;
               client.emit('messageReactionRemove', reactionObj, user);
            }
         });
      })
   })
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
         /*
      case "ROLEMESSAGE":
         message.channel.send('This will print out the emoji repsonse message again');
         //TODO: include code to assign the message in the database
         break;*/
      case "SETMESSAGE":
         var lines = message.content.split('\n');
         var roleAssociations = message.content.match(emojiRegex);
         var customAssociations = message.content.match(customRegex);
         if (!SetMessageVerification(lines, message, roleAssociations, customAssociations)) {
            break;
         }
         var type = (lines[0].split(' ')[2].toUpperCase() === 'ANY') ? 1 : 2;
         messages.addMessage(message.id, message.guild.id, type, function(storedMessage) {
            console.log(storedMessage);
         });
         //TODO: include code to insert a server record in the database with this message number
         break;
      case "TEST":
         messages.getMessageById('715243787919556628', function(message) {
            console.log(message);
         });
         break;
      default:
         message.channel.send('Unknown command, try using: **rb!help**');
         break;
   }
}

/**adds or removes users from roles specified in a server */
function RoleAssignment(choice, desiredRole, user) {
   
}

function IdentifiedMessage(reaction) {
   if (reaction.message !== undefined) return reaction.message;
   var channel = client.channels.cache.find(r => r.id === reaction.channel_id);
   return channel.messages.cache.find(m => m.id === reaction.message_id);
}

/**verifies the rb!setmessage command has the correct format and will try to print out tailored error messages
 * based on what is found to be wrong with it
 */
function SetMessageVerification(lines, message, roleAssociations, customAssociations) {
   if (!Line1SetMessageVerification(lines[0].split(' '))) {
      message.channel.send(`${config.clMessages.formatMessage}\n${config.clMessages.correctFormatExample}`);
      return false;
   }
   //console.log('reached  role association');
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
   if (line1[2].toUpperCase() !== "ANY" && line1[2].toUpperCase() !== "ONE") return false;
   else return true;
}

/**Determines if a user is already in a specified role */
function HasRole(member, role) {
   let hasRole = member.roles.cache.find(r => r.name === role);
   return (hasRole === undefined) ? false : true;
}