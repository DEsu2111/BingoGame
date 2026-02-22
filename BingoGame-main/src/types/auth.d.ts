export interface AuthUser {
  id: string;
  telegramUserId: string;
  nickname?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  isFirstTime: boolean;
}
