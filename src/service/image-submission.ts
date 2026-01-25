import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Message, MessageFlags, type TextChannel } from "discord.js";
import { detectCharactersAndDate } from './ai-service';
import { getCharacterOwners, getIncompleteUsers } from './character-service';
import { getServerToday } from '../utils/date';
import { startRaidCompletionWorkflow } from "./raid-completion-workflow";

export async function handleImageSubmissionMessage(message: Message, requireDateSelection: boolean = false): Promise<void> {
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
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

    const contentMessage = '## 請注意, 記錄尚未完成 \n請選擇要記錄的內容:';

    await message.reply({
        content: contentMessage,
        components: [row],
    });

    // Extract image URLs from message
    const imageUrls: string[] = [];
    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image/')) {
            imageUrls.push(attachment.url);
        }
    }

    // If there are images, try to detect characters in a separate message
    // Only do detection for today's submission (when requireDateSelection is false)
    if (imageUrls.length > 0 && !requireDateSelection) {
        try {
            const raidDate = getServerToday();
            const detectionResult = await detectCharactersAndDate(imageUrls, raidDate);

            if (detectionResult.detectedCharacter.length > 0) {
                // Get character owners and incomplete users
                const characterOwners = await getCharacterOwners(raidDate);
                const incompleteUsers = await getIncompleteUsers(raidDate);

                // Find users to tag (exclude the message author, only tag incomplete users)
                const usersToTag = new Set<string>();
                const detectedOwnCharacters: string[] = [];
                const detectedOtherCharacters: string[] = [];

                for (const characterName of detectionResult.detectedCharacter) {
                    const ownerIds = characterOwners.get(characterName);
                    if (ownerIds && ownerIds.length > 0) {
                        let hasOtherOwner = false;
                        let isOwnCharacter = false;

                        for (const ownerId of ownerIds) {
                            if (ownerId === message.author.id) {
                                isOwnCharacter = true;
                            } else if (incompleteUsers.has(ownerId)) {
                                // Only tag users who haven't completed all raids today
                                usersToTag.add(ownerId);
                                hasOtherOwner = true;
                            }
                        }

                        if (isOwnCharacter) {
                            detectedOwnCharacters.push(characterName);
                        }
                        if (hasOtherOwner) {
                            detectedOtherCharacters.push(characterName);
                        }
                    }
                }

                // Build detection message
                let detectionMessage = '';
                if (usersToTag.size > 0) {
                    const userTags = Array.from(usersToTag).map(userId => `<@${userId}>`).join(' ');
                    detectionMessage += `偵測到其他成員的角色: ${detectedOtherCharacters.join(', ')}\n${userTags}\n若你確定你包含在此圖片內, 你可以點擊以下按鈕去記錄所有角色的完成. 若你未完成所有角色的HC, 請個別提交記錄.`;
                }

                // Send detection results in a separate message with button
                if (detectionMessage && message.channel.isTextBased()) {
                    const detectionRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`complete_all_from_detection_${message.id}`)
                                .setLabel('完成所有角色的HC')
                                .setStyle(ButtonStyle.Primary)
                        );

                    const detectionDcMessage = await (message.channel as TextChannel)?.send({
                        content: detectionMessage,
                        components: [detectionRow],
                    });

                    setTimeout(async () => {
                        await detectionDcMessage.delete();
                    }, 5 * 60 * 1000);
                }
            }
        } catch (error) {
            console.error('Error detecting characters:', error);
            // Continue with normal flow even if detection fails
        }
    }

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

    // skipToCompletion=true means we'll complete immediately after date selection (if required)
    await startRaidCompletionWorkflow(interaction, interaction.user.id, requireDateSelection, true);
}

export async function handleCompleteAllFromDetection(interaction: ButtonInteraction): Promise<void> {
    // Parse original message ID from customId (format: complete_all_from_detection_{messageId})
    const customIdParts = interaction.customId.split('_');
    const originalMessageId = customIdParts[customIdParts.length - 1];

    // Extract tagged user IDs from the message content
    const messageContent = interaction.message.content || '';
    const userTagRegex = /<@(\d+)>/g;
    const taggedUserIds = new Set<string>();
    let match;
    while ((match = userTagRegex.exec(messageContent)) !== null) {
        taggedUserIds.add(match[1]!);
    }

    // Verify the user who clicked is in the tagged list
    if (!taggedUserIds.has(interaction.user.id)) {
        await interaction.reply({
            content: '你不能使用這個按鈕.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferUpdate();

    // Start the workflow first (this will handle the interaction response)
    // Always no date selection for detection flow (only for today)
    // skipToCompletion=true means we'll complete immediately
    // Pass the original message ID as evidence
    await startRaidCompletionWorkflow(interaction, interaction.user.id, false, true, originalMessageId);

    // After workflow completes, update the detection message to remove the user's tag
    taggedUserIds.delete(interaction.user.id);

    // Rebuild the message content without the clicked user's tag
    const updatedUserTags = Array.from(taggedUserIds).map(userId => `<@${userId}>`).join(' ');
    const lines = messageContent.split('\n');
    if (lines.length >= 3) {
        // Update the user tags line (second line)
        lines[1] = updatedUserTags;
        const updatedContent = lines.join('\n');

        // If no more users are tagged, remove the button
        if (taggedUserIds.size === 0) {
            await interaction.message.edit({
                content: updatedContent,
                components: [],
            });
        } else {
            await interaction.message.edit({
                content: updatedContent,
            });
        }
    }
}