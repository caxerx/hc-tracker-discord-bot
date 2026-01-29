import { Language } from "@/generated/prisma/enums";
import { Locale } from "discord.js";

const languageMap = {
    [Language.Chinese]: Locale.ChineseTW,
    [Language.English]: Locale.EnglishUS,
}

export function getDiscordLocale(language?: Language) {
    return language ? (languageMap[language] ?? Locale.EnglishUS) : Locale.EnglishUS;
}