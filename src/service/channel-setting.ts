import { cacheLife, cacheTag } from "@commandkit/cache";
import { prisma } from "./db";
import { Language, type ChannelType } from "@/generated/prisma/enums";

export async function getChannelTypes(channelId: string) {
  "use cache";

  cacheTag(`channel:${channelId}`);
  cacheTag("settings");
  cacheLife("1d");

  const channelSettings = await prisma.channelSetting.findMany({
    where: {
      channelId,
    },
    select: {
      channelType: true,
    },
  });

  return channelSettings.map((setting) => setting.channelType);
}

export async function isChannelType(
  channelId: string,
  channelType: ChannelType,
) {
  "use cache";

  cacheTag(`channel:${channelId}`);
  cacheTag("settings");
  cacheLife("1d");

  return (
    (await prisma.channelSetting.count({
      where: {
        channelId,
        channelType,
      },
    })) > 0
  );
}

export async function getAllChannelWithType(channelType: ChannelType) {
  "use cache";

  cacheTag("settings");
  cacheLife("1d");

  return await prisma.channelSetting.findMany({
    where: { channelType },
  });
}

export async function getChannelLanguage(channelId: string) {
  "use cache";

  cacheTag(`channel:${channelId}`);
  cacheTag("settings");
  cacheLife("1d");

  const channelSetting = await prisma.channelSetting.findFirst({
    where: {
      channelId,
    },
    select: {
      channelLanguage: true,
    },
  });

  return channelSetting?.channelLanguage ?? Language.English;
}
