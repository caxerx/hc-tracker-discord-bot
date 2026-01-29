import { ActionRow, Button, Container, Label, Separator, StringSelectMenu, StringSelectMenuOption, TextDisplay, type CommandKitModalBuilderInteractionCollectorDispatch, type ModalKit, type OnModalKitSubmit } from "commandkit";

import { createOrUpdateSession, getSession, type ReportGenerationSession } from "@/service/session";
import { fetchT } from "@commandkit/i18n";
import { ButtonStyle, MessageFlags, type ButtonInteraction, type TextChannel } from "discord.js";
import { getServerToday } from "@/utils/date";
import { RaidType } from "@/generated/prisma/enums";
import { endOfWeek, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { getQuickReportDateOrRange, getQuickReportTypeMapping } from "@/service/report";
import { ReportModal } from "./report-modal";
import { getDailyReportContent, getRangedReportContent } from "@/service/report-content";

export const ReportGenerationActionMessage = async ({
    sessionId,
}: {
    sessionId: string;
}) => {
    const session = await getSession(sessionId) as ReportGenerationSession;
    const t = fetchT(session?.locale)

    const today = getServerToday();
    const yesterday = subDays(today, 1);

    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(thisWeekStart, { weekStartsOn: 1 });

    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

    return <>
        <TextDisplay content={t('report:report-generation-action-message')} />
        <ActionRow>
            <Button
                customId="last-week"
                label={
                    t('report:report-type:last-week',
                        {
                            startDate: format(lastWeekStart, 'yyyy-MM-dd'),
                            endDate: format(lastWeekEnd, 'yyyy-MM-dd')
                        }
                    )
                }
                style={ButtonStyle.Primary}
                onClick={getReportQuickGenerationHandler(sessionId, 'last-week')}
            />
            <Button
                customId="this-week"
                label={
                    t('report:report-type:this-week',
                        {
                            startDate: format(thisWeekStart, 'yyyy-MM-dd'),
                            endDate: format(thisWeekEnd, 'yyyy-MM-dd')
                        }
                    )
                }
                style={ButtonStyle.Primary}
                onClick={getReportQuickGenerationHandler(sessionId, 'this-week')}
            />
        </ActionRow>

        <ActionRow>
            <Button
                customId="today"
                label={t('report:report-type:yesterday',
                    {
                        date: format(yesterday, 'yyyy-MM-dd')
                    }
                )}
                style={ButtonStyle.Success}
                onClick={getReportQuickGenerationHandler(sessionId, 'yesterday')}
            />
            <Button
                customId="yesterday"
                label={t('report:report-type:today',
                    {
                        date: format(today, 'yyyy-MM-dd')
                    }
                )}
                style={ButtonStyle.Success}
                onClick={getReportQuickGenerationHandler(sessionId, 'today')}
            />

        </ActionRow>

        <ActionRow>
            <Button
                label={t('report:report-type:weekly')}
                style={ButtonStyle.Primary}
                onClick={getReportShowModalHandler(sessionId, 'weekly')}
            />
            <Button
                label={t('report:report-type:daily')}
                style={ButtonStyle.Success}
                onClick={getReportShowModalHandler(sessionId, 'daily')}
            />
            <Button
                label={t('report:report-type:monthly')}
                style={ButtonStyle.Secondary}
                onClick={getReportShowModalHandler(sessionId, 'monthly')}
            />
        </ActionRow>
    </>
}

function getReportShowModalHandler(sessionId: string, type: 'daily' | 'weekly' | 'monthly') {
    return async (interaction: ButtonInteraction) => {
        const session = await getSession(sessionId) as ReportGenerationSession;
        session.reportType = type;
        await createOrUpdateSession(session);
        const modal = await ReportModal({ sessionId });
        await interaction.showModal(modal);
    }
}

function getReportQuickGenerationHandler(sessionId: string, type: 'today' | 'yesterday' | 'last-week' | 'this-week') {
    return async (interaction: ButtonInteraction) => {
        const session = await getSession(sessionId) as ReportGenerationSession;

        session.reportType = getQuickReportTypeMapping(type);
        if (type === 'today' || type === 'yesterday') {
            session.reportStartDate = format(getQuickReportDateOrRange(type), 'yyyy-MM-dd');
        } else {
            const [startDate, endDate] = getQuickReportDateOrRange(type);
            session.reportStartDate = format(startDate, 'yyyy-MM-dd');
            session.reportEndDate = format(endDate, 'yyyy-MM-dd');
        }
        session.reportRaidType = RaidType.Kirollas

        await createOrUpdateSession(session);

        const channel = interaction.channel as TextChannel;

        if (type === 'today' || type === 'yesterday') {
            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: await getDailyReportContent(sessionId)
            });
        } else {
            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: await getRangedReportContent(sessionId)
            });
        }
    }
}

