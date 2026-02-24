import { Client, GatewayIntentBits, Partials, TextChannel, GuildMember, Message, Events, User, Role, ReactionEmoji, GuildEmoji, ApplicationEmoji, REST, Routes } from 'discord.js';
import * as config from './config.json';
import dotenv from 'dotenv';
import { installCommands, helpCommand } from './commands';
dotenv.config();

const token = process.env.TOKEN;

if (!token) {
    console.error('Error: TOKEN environment variable is not set.');
    process.exit(1);
}

interface Config {
    messages: {
        JOIN_SERVER_MESSAGE: string;
        ADDED_TO_ROLE_MESSAGE: string;
        REMOVED_FROM_ROLE_MESSAGE: string;
        ONE_ROLE_AT_A_TIME: string;
        BOT_NEEDS_PERMISSION: string;
        USER_ALREADY_A_MEMBER: string;
        MULTIPLE_ROLES_ON_CHOOSE_ONE: string;
        CORRECT_FORMAT_EXAMPLE: string;
        INCORRECT_SETMESSAGE_FORMAT: string;
        LACK_OF_ASSOCIATION_REQUIREMENTS: string;
        ANIMATED_EMOJI_USED: string;
        REACTION_MESSAGE_NOW_INVALID: string;
        HELP: string;
    };
}

const typedConfig = config as Config;

const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])\s*<@&[0-9]+>/gi;
const customRegex = /<:[\w-]+:[0-9]+>\s*<@&[0-9]+>/gi;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once(Events.ClientReady, async () => {
    if (client.user) {
        client.user.setStatus('online');
        client.user.setActivity('@react4role help', { type: 3 }); // WATCHING is type 3
    }
    const rest = new REST({ version: '10' }).setToken(token);
    var guilds = await client.guilds.fetch();
    guilds.forEach(async guild => {
        console.log(`Installing commands for guild: ${guild.name}, ${guild.id}`);
        await installCommands(client.application!.id, guild.id, rest);
    });
    console.log('Ready!');
});

client.login(token);

/**Prints the join message */
client.on(Events.GuildCreate, async guild => {
    try {
        const textChannel = guild.channels.cache.find(channel =>
            channel.type === 0 && (channel as TextChannel).permissionsFor(guild.members.me!)?.has('SendMessages')
        ) as TextChannel;
        if (textChannel) textChannel.send(typedConfig.messages.JOIN_SERVER_MESSAGE);
    } catch (e) {
        console.error(e);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (!(interaction.channel instanceof TextChannel)) {
            return;
        }
        if (!interaction.isChatInputCommand()) return;

        await helpCommand.execute(interaction);
    } catch (error) {
        console.log('error running interaction');
        console.log(error);
    }
});

/**responds to the server owner with the help message if the criteria are met */
client.on(Events.MessageCreate, async message => {
    try {
        if (message.partial) {
            message = await message.fetch();
        }
        if (message.author.bot || !message.guild) return;
        if (message.member?.id !== message.guild.ownerId) return;

        if (message.mentions.users.has(client.user!.id)) {
            if (!(await RoleMessageVerification(message))) {
                message.channel.send(typedConfig.messages.HELP);
            }
        }
    } catch (error) {
        console.log('error creating message');
        console.log(error);
    }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        //partial retrieval
        if (reaction.partial) {
            reaction = await reaction.fetch();
        }
        if (reaction.message.partial) {
            reaction.message = await reaction.message.fetch();
        }
        console.log(reaction.message);
        const roleMessage = await isRoleMessage(reaction.message);
        console.log(roleMessage);
        if (user.partial) {
            user = await user.fetch();
        }
        if (roleMessage) {
            //we can add the user to the role
            await roleHandling(reaction.message, reaction.emoji, user, true, reaction.message.channel as TextChannel);
        }
    } catch (error) {
        console.log('error adding role');
        console.log(error);
    }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
        //partial retrieval
        if (reaction.partial) {
            reaction = await reaction.fetch();
        }
        if (reaction.message.partial) {
            reaction.message = await reaction.message.fetch();
        }
        const roleMessage = await isRoleMessage(reaction.message);
        if (user.partial) {
            user = await user.fetch();
        }
        if (roleMessage) {
            //we can remove the user from the role
            await roleHandling(reaction.message, reaction.emoji, user, false, reaction.message.channel as TextChannel);
        }
    } catch (error) {
        console.log('error removing role');
        console.log(error);
    }
});

client.on(Events.MessageUpdate, async message => {
    try {
        if (message.partial) {
            message = await message.fetch();
        }
        await isRoleMessage(message, true);
    } catch (error) {
        console.log('error updating role message');
        console.log(error);
    }
});

async function isRoleMessage(message: Message, isUpdate: boolean = false): Promise<boolean> {
    if (!message.channel.isTextBased()) return false;
    const channel = (await message.channel.fetch()) as TextChannel;
    //determined that the message is in the role channel
    if (channel.name === 'roles' || (channel.topic?.includes('@react4role') ?? false)) {
        const roleMessage = await RoleMessageVerification(message);
        if (isUpdate && !roleMessage) {
            channel.send(typedConfig.messages.REACTION_MESSAGE_NOW_INVALID);
        }
        return roleMessage;
    }
    return false;
}

async function roleHandling(message: Message, reaction: GuildEmoji | ReactionEmoji | ApplicationEmoji, user: User, adding: boolean, channel: TextChannel) {
    //reaction didn't occur in a guild
    if (!message.guild) return;

    let reactLine: RegExpMatchArray | null;
    if (!reaction.id) {
        reactLine = message.content.match(new RegExp(`${reaction.name}\\s*<@&[0-9]+>`, 'gi'));
    } else {
        reactLine = message.content.match(new RegExp(`<:${reaction.name}:${reaction.id}>\\s*<@&[0-9]+>`, 'gi'));
    }

    //nothing matched so we likely have someone reacting with a non-role emoji
    if (!reactLine) return;

    const roleMention = reactLine[0].match(/<@&([0-9]+)>/i);
    if (!roleMention) return;

    const roleId = roleMention[1];
    let desiredRole: Role | null | undefined = message.guild?.roles.cache.get(roleId);
    if (!desiredRole) {
        desiredRole = await message.guild?.roles.fetch(roleId);
    }
    if (!desiredRole) return;

    const member = await message.guild.members.fetch(user.id);
    if (!member) return;

    if (member.roles.cache.has(desiredRole.id) && adding) {
        user.send(`${typedConfig.messages.USER_ALREADY_A_MEMBER} ${desiredRole.name}`);
        return;
    }

    try {
        let removedRolesMsg: string | null = null;
        if (adding) {
            const line1 = message.content.split('\n')[0].split(' ').filter(word => word.trim().length > 0);
            let removedRoles: string[] | null = null;
            if (line1[2] && line1[2].toLowerCase() === 'one') {
                removedRoles = await RemoveRoleFromChooseOne(message, member);
            }

            if (removedRoles) {
                removedRolesMsg = `You have switched roles from **${removedRoles.join(", ")}**`;
            }

            await member.roles.add(desiredRole);
        } else {
            await member.roles.remove(desiredRole);
        }
        const messageLink = `https://discordapp.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`;
        if (removedRolesMsg) {
            await user.send(`${removedRolesMsg} to **${desiredRole.name}** role in **${message.guild?.name}** ${typedConfig.messages.ONE_ROLE_AT_A_TIME}\n${messageLink}`);
        } else {
            const statement = (adding) ? typedConfig.messages.ADDED_TO_ROLE_MESSAGE : typedConfig.messages.REMOVED_FROM_ROLE_MESSAGE;
            await user.send(`${statement} **${desiredRole.name}** role in **${message.guild?.name}**\n${messageLink}`);
        }
    } catch (error) {
        console.log(error);
        //we can assume the bot doesn't have permission to do this
        channel.send(typedConfig.messages.BOT_NEEDS_PERMISSION);
    }

}

/**Determines if a user is already in a specified role */
function HasRole(member: GuildMember, roleId: string) {
    return member.roles.cache.has(roleId);
}

/**Determines if a message for reacting to roles is valid or not */
async function RoleMessageVerification(message: Message): Promise<boolean> {
    if (!message.guild) return false;
    const guild = await message.guild.fetch();
    if (message.author.id !== guild.ownerId) return false;

    const lines = message.content.split('\n');
    if (lines.length < 2) return false;

    //getting the first line and splitting it into words
    let line1 = lines[0].split(" ");
    //removing any whitespace from the array
    line1 = line1.filter(word => word.trim().length > 0);
    if (line1.length < 3) return false;

    //checking if the first word is the bot id
    const botId = client.user?.id;
    if (!botId || !line1[0].toLowerCase().includes(botId)) return false;
    //checking if the second word is 'choose'
    if (line1[1].toLowerCase() !== "choose") return false;
    //checking if the third word is 'any' or 'one'
    if (line1[2].toLowerCase() !== 'any' && line1[2].toLowerCase() !== 'one') return false;

    //checking if there are any role associations
    const roleAssociations = message.content.match(emojiRegex);
    const customAssociations = message.content.match(customRegex);
    if (roleAssociations === null && customAssociations === null) return false;

    return true;
}

/**removes all other roles that a user might be in if they select a role in a 'choose one' message 
 * then builds a string to return containing the list of roles the user was removed from
*/
async function RemoveRoleFromChooseOne(message: Message, member: GuildMember): Promise<string[] | null> {
    const removedRoles: string[] = [];
    const removePromises: Promise<GuildMember>[] = [];

    message.mentions.roles.forEach(role => {
        if (HasRole(member, role.id)) {
            removePromises.push(member.roles.remove(role));
            removedRoles.push(role.name);
        }
    });

    await Promise.all(removePromises);
    return (removedRoles.length === 0) ? null : removedRoles;
}