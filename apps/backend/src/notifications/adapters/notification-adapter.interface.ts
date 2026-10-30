export interface NotificationAdapter {
  send(recipient: string | null, message: string, payload?: unknown): Promise<void>;
}
