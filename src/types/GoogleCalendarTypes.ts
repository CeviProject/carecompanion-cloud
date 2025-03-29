
export interface GoogleCalendarToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  provider: string;
}

export interface GoogleCalendarContextType {
  isEnabled: boolean;
  isLoading: boolean;
  authorizeGoogleCalendar: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}
