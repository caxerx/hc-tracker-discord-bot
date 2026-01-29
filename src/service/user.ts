import { cacheLife, cacheTag } from "@commandkit/cache";
import { prisma } from "./db";

export async function getUserCharacters(discordUserId: string) {
    'use cache';
    cacheTag(`user:${discordUserId}`);
    cacheLife('1d');

    const characters = await prisma.registerCharacter.findMany({
        where: {
            registerDiscordUserId: discordUserId,
            unregisterDate: {
                gte: new Date(),
            },
        },
    });

    return characters
}

export async function isAdmin(discordUserId: string) {
    'use cache';
    cacheTag(`user:${discordUserId}`);
    cacheLife('1d');

    const count = await prisma.userSetting.count({
        where: {
            discordUserId,
            isAdmin: true,
        },
    });

    return count > 0;
}