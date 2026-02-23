/**
 * haptics.ts — Haptic Feedback Utility for Telegram Mini Apps
 */

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram;
        if (tg?.WebApp?.HapticFeedback) {
            tg.WebApp.HapticFeedback.impactOccurred(style);
        }
    }
};

export const triggerNotificationHaptic = (type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram;
        if (tg?.WebApp?.HapticFeedback) {
            tg.WebApp.HapticFeedback.notificationOccurred(type);
        }
    }
};
