export class PresenceService {
    constructor(runtimeMetaStore, serverInstanceId, presenceTtlMs) {
        this.runtimeMetaStore = runtimeMetaStore;
        this.serverInstanceId = serverInstanceId;
        this.presenceTtlMs = presenceTtlMs;
    }

    getPresenceToken(socketId) {
        return `${this.serverInstanceId}:${socketId}`;
    }

    async claimPresence(telegramUserId, socketId) {
        const token = this.getPresenceToken(socketId);
        return await this.runtimeMetaStore.claimPresence(telegramUserId, token, this.presenceTtlMs);
    }

    async refreshPresence(telegramUserId, socketId) {
        const token = this.getPresenceToken(socketId);
        return await this.runtimeMetaStore.refreshPresence(telegramUserId, token, this.presenceTtlMs);
    }

    async releasePresence(telegramUserId, socketId) {
        const token = this.getPresenceToken(socketId);
        await this.runtimeMetaStore.releasePresence(telegramUserId, token);
    }
}
