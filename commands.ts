
import { SlashCommandBuilder, ChatInputCommandInteraction, SlashCommandSubcommandsOnlyBuilder, SlashCommandOptionsOnlyBuilder, REST, Routes } from 'discord.js';
import { messages } from './config.json';

interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const helpCommand: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('How to use react4role'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply(messages.HELP);
    },
};

export async function installCommands(clientId: string, guildId: string, rest: REST) {
    const route = guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

    await rest.put(
        route,
        { body: [helpCommand.data.toJSON()] }
    );
}