export interface TwitterConfig {
  twitterConfigured: boolean;
  homeEnabled?: boolean;
}

export interface TwitterStatus {
  connected: boolean;
  status?: "active" | "action_required" | "session_invalid" | "disconnected";
  twitterUserId?: string;
  handle?: string;
  displayName?: string;
  connectedAt?: string;
  activeSources?: number;
}

export interface TwitterSource {
  id: string;
  kind: "account" | "list" | "home";
  handle?: string;
  listId?: string;
  displayName?: string;
  isActive: boolean;
  signalsCount?: number;
  lastItemAt?: string;
}

export interface TwitterResolveResult {
  handle: string;
  displayName?: string;
  userId?: string;
}
