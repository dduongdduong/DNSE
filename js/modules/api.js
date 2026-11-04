import { api } from './api-client.js';
/**
 * DNSE AI
 * @returns {{reply: string, source: 'ai'|'local'|'error'}}
 */
export async function askDNSEAI(userPrompt, userProfile) {
    try {
        const data = await api.post('/ai/chat', { userId: userProfile.id, message: userPrompt });
        return { reply: data.reply, source: data.source };
    } catch (err) {
        return { reply: err.message, source: 'error' };
    }
}

export async function getSmartToolsAdvice(userProfile, refresh = false) {
    try {
        return await api.post('/ai/tools-advice', { userId: userProfile.id, refresh });
    } catch (err) {
        console.error('Lỗi tải gợi ý dụng cụ:', err);
        return null;
    }
}
