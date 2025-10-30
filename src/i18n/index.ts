import * as vscode from 'vscode';
import { enUS } from './locales/en-US';
import { zhCN } from './locales/zh-CN';

type TranslationKey = keyof typeof zhCN;

let currentLocale: 'en-US' | 'zh-CN' = 'zh-CN';

const translations: Record<string, Record<TranslationKey, string>> = {
    'en-US': enUS as any,
    'zh-CN': zhCN as any
};

/**
 * Initialize i18n system and load locale preference
 */
export function initI18n(context: vscode.ExtensionContext): void {
    // Load saved locale preference
    const savedLocale = context.globalState.get<'en-US' | 'zh-CN'>('yaklang.locale');
    if (savedLocale) {
        currentLocale = savedLocale;
    }
}

/**
 * Get current locale
 */
export function getLocale(): 'en-US' | 'zh-CN' {
    return currentLocale;
}

/**
 * Set locale and save preference
 */
export async function setLocale(locale: 'en-US' | 'zh-CN', context: vscode.ExtensionContext): Promise<void> {
    currentLocale = locale;
    await context.globalState.update('yaklang.locale', locale);
}

/**
 * Translate a key to the current locale
 */
export function t(key: TranslationKey, ...args: any[]): string {
    let text = translations[currentLocale]?.[key] || translations['zh-CN'][key] || key;
    
    // Simple template replacement for {0}, {1}, etc.
    if (args.length > 0) {
        args.forEach((arg, index) => {
            text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
        });
    }
    
    return text;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Array<{ id: 'en-US' | 'zh-CN', name: string }> {
    return [
        { id: 'zh-CN', name: '简体中文' },
        { id: 'en-US', name: 'English' }
    ];
}

