import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Message, MessageFlags } from "discord.js";

export async function handleImageSubmissionMessage(message: Message, requireDateSelection: boolean = false): Promise<void> {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`start_raid_workflow_${message.author.id}_${requireDateSelection}`)
            .setLabel('記錄部份角色')
            .setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder()
            .setCustomId(`start_raid_workflow_allchars_yes_${message.author.id}_${requireDateSelection}`)
            .setLabel('完成所有角色的HC')
            .setStyle(ButtonStyle.Primary)
    );

    await message.reply({
        content: '請選擇要記錄的內容:',
        components: [row],
    });

    return;
}

export async function handleStartRaidWorkflowAllCharsYes(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.message.reference?.messageId) return;
    const originalMessage = await interaction.channel?.messages.fetch(interaction.message.reference?.messageId);
    if (!originalMessage) return;

    if (interaction.user.id !== originalMessage?.author?.id) {
        await interaction.reply({
            content: '你不能使用這個按鈕.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }


    // Parse requireDateSelection from customId (format: start_raid_workflow_allchars_yes_{userId}_{requireDateSelection})
    const customIdParts = interaction.customId.split('_');
    const requireDateSelection = customIdParts[customIdParts.length - 1] === 'true';

    const { startRaidCompletionWorkflow } = await import('./raid-completion-workflow');
    // skipToCompletion=true means we'll complete immediately after date selection (if required)
    await startRaidCompletionWorkflow(interaction, interaction.user.id, requireDateSelection, true);
}