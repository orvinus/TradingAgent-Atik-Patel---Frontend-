import { StateCreator } from "zustand";
import { AppState } from "../index";
 
export interface Alert {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  ts: number;
  read: boolean;
}
 
export interface AlertsSlice {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Omit<Alert, "id" | "ts" | "read">) => void;
  markAllRead: () => void;
  clearAlerts: () => void;
}
 
export const createAlertsSlice: StateCreator<AppState, [], [], AlertsSlice> = (set) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (alert) =>
    set((s) => {
      const newAlert: Alert = {
        ...alert,
        id: crypto.randomUUID(),
        ts: Date.now(),
        read: false,
      };
      return {
        alerts: [newAlert, ...s.alerts].slice(0, 100),
        unreadCount: s.unreadCount + 1,
      };
    }),
  markAllRead: () =>
    set((s) => ({
      alerts: s.alerts.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    })),
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
});