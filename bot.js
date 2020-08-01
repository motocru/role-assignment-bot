const Discord = require('discord.js');
const {prefix, token} = require('./auth.json');
const config = require('./config.json');
const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])\s*<@&[0-9]+>/gi;
const customRegex = /<:[\w-]+:[0-9]+>\s*<@&[0-9]+>/gi;
const client = new Discord.Client();

client.once('ready', () => {
    console.log('Ready!');
    client.user.setStatus('available');
    client.user.setActivity('@react4role help', {type: 'WATCHING'})
    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
    .catch(console.error);
 });
 
 client.login(token);

 /**Prints the join message */
 client.on('guildCreate', guild => {
    let channels = guild.channels.cache;
    const textChannel = channels.find(channel => (
       !channel.deleted &&
       channel.type === 'text'
    ));
    if (textChannel !== null) textChannel.send(config.messages.JOIN_SERVER_MESSAGE);
 })

 /**responds to the server owner with the help message if the criteria are met */
 client.on('message', message => {
    if (message.author.bot || message.member.id !== message.guild.ownerID) return;
    var mentionedUser = message.mentions.users.find(user => user.id === client.user.id);
    if (mentionedUser === undefined) return;
    //console.log(message);
    if (!RoleMessageVerification(message)) {
        message.channel.send(config.messages.HELP);
    }
 });

/**works for getting messageReactionAdd and messageReactionRemove working
 * for messages thatare not cached
 */
client.on('raw', packet => {
    //returns if the event is not a message reaction add or remove
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    var channelPromise = client.channels.fetch(packet.d.channel_id);
    //console.log(packet.d);
    channelPromise.catch(console.error)
    .then(channel => {
        if (!DetermineRoleChannel(channel)) return;
       //Returns if the message is found in cache which means it will already trigger
       //if (channel.messages.cache.get(packet.d.message_id) !== undefined) return;
       channel.messages.fetch(packet.d.message_id).catch(console.error)
       .then(message => {
          if (message.deleted) return;
          if (!RoleMessageVerification(message)) return;
          const emoji = packet.d.emoji.id ? packet.d.emoji.id : packet.d.emoji.name;
          const reaction = message.reactions.cache.get(emoji);
          client.users.fetch(packet.d.user_id, true).catch(console.error)
          .then(user => {
             if (packet.t === 'MESSAGE_REACTION_ADD') RoleAssignment('add', user, reaction, message);
             else {
                 var reactionObj = packet.d.emoji;
                 RoleAssignment('rem', user, reactionObj, message);
             }
          });
       })
    })
 });

 /**adds or removes a user from a role based on their given choice */
function RoleAssignment(assignment, user, reaction, message) {
    //console.log(reaction);
    if (reaction._emoji === undefined) reaction._emoji = {name: reaction.name, id: reaction.id};
    if (reaction._emoji.id === null) reactLine = message.content.match(new RegExp(`${reaction._emoji.name}\\s*<@&[0-9]+>`, 'gi'));
    else reactLine = message.content.match(new RegExp(`<:${reaction._emoji.name}:${reaction._emoji.id}>\\s*<@&[0-9]+>`, 'gi'));
    if (reactLine === null) return;
    reactLine = reactLine[0].match(/<@&[0-9]+>/gi);
    reactLine = reactLine[0].replace(/[<@&>]/gi, '');
    const desiredRole = message.guild.roles.cache.find(role => (role.id === reactLine));
    //console.log(desiredRole);
    var member = message.channel.guild.members.cache.find(m => m.id === user.id);
    if (HasRole(member, desiredRole) && assignment === 'add') {
        user.send(`${config.messages.USER_ALREADY_A_MEMBER} ${desiredRole.name}`); 
        return;
    }
    if (assignment == 'add') {
        const line1 = message.content.split('\n')[0].split(' ');
        if (line1[2].toLowerCase() === 'one') {
            RemoveRoleFromChooseOne(message, member);
        }
        member.roles.add(desiredRole).catch(console.error)
        .then(result => {
            AddRemoveRoleResult(result, message, user, desiredRole, assignment);
        });
    } else {
        member.roles.remove(desiredRole).catch(console.error)
      .then(result => {
         AddRemoveRoleResult(result, message, user, desiredRole, assignment);
      });
    }
    
}

/**Verifies if a user was added / removed from the desired role and sends a message to the user
 * If the bot does not have permission to change the roles it prints a message to the server
 */
function AddRemoveRoleResult(result, message, user, role, choice) {
    if (result === undefined) {
       console.log(result);
       message.channel.send(config.messages.BOT_NEEDS_PERMISSION);
       return;
    }
    var statement = (choice === 'add') ? config.messages.ADDED_TO_ROLE_MESSAGE : config.messages.REMOVED_FROM_ROLE_MESSAGE;
    var messageLink = `https://discordapp.com/channels/${message.channel.guild.id}/${message.channel.id}/${message.id}`;
    user.send(`${statement} **${role.name}** in ${message.channel.guild.name}\n${messageLink}`);
 }

/**Determines if a user is already in a specified role */
function HasRole(member, role) {
    let hasRole = member.roles.cache.find(r => r.id === role);
   return (hasRole === undefined) ? false : true;
 }

/**Determines if a channel is a valid role channel */
function DetermineRoleChannel(channel) {
    if (!channel.deleted && channel.type === 'text') {
        if (channel.name.toLowerCase() === 'roles') return true;
        else {
            if (channel.topic === null) return false;
            if (channel.topic.toLowerCase().includes('@react4role')) return true;
        }
    }
    return false;
}

/**Determines if a message for reacting to roles is valid or not */
function RoleMessageVerification(message) {
    //verifies the first line 
    const author = message.author.id;
    if (author !== message.channel.guild.ownerID) return false;
    var lines = message.content.split('\n');
    var line1 = lines[0].split(" ");
    if (line1.length < 3 || lines.length < 2) return false;
    if (!line1[0].toLowerCase().includes(client.user.id)) return false;
    if (line1[1].toLowerCase() !== "choose") return false;
    if (line1[2].toLowerCase() !== 'any' && line1[2].toLowerCase() !== 'one') return false;
    //verifies all subsequent lines
    var roleAssociations = message.content.match(emojiRegex);
    var customAssociations = message.content.match(customRegex);
    if (roleAssociations === null && customAssociations === null) return false;
    return true;
}

/**removes all other roles that a user might be in if they select a role in a 'choose one' message */
function RemoveRoleFromChooseOne(message, member) {
    message.mentions.roles.forEach(element => {
        if (HasRole(member, element.id)) {
            member.roles.remove(element).catch(console.error)
            .then(result => {
                AddRemoveRoleResult(result, message, member, element, 'rem');
            });
        }
    });
}