import zh from './zh';
import en from './en';
import { Language } from '../generated/prisma/enums';

const DEFAULT_LANGUAGE = Language.English;

export const messages = {
    [Language.Chinese]: zh,
    [Language.English]: en,
}

export function getMessage(language: Language, key: keyof typeof messages[Language], params?: string[]): string {
    if (key == null) {
        throw new Error(`Message key is null`);
    }

    const targetMessage = messages[language]?.[key] ?? messages[DEFAULT_LANGUAGE]?.[key];

    if (targetMessage == null || typeof targetMessage !== 'string') {
        console.warn(`Message ${key} not found for language ${language}`);
    }

    const fallbackMessage = targetMessage ?? key;

    if (params) {
        return fallbackMessage.replace(/{(\d+)}/g, (match, p1) => params[parseInt(p1)] || match);
    }

    return fallbackMessage;
}

export function getI18n(language: Language) {
    return {
        t: (key: string) => getMessage(language, key),
    }
}

export function fallbackT(key: string, params?: string[]) {
    return getMessage(DEFAULT_LANGUAGE, key, params);
}