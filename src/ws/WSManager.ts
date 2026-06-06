// src/ws/WSManager.ts
export class WSManager {
  private socket: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(msg: any) => void>>();
  private reconnectAttempts = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isVisible = true;
 
  connect(token: string) {
    const url = `${import.meta.env.VITE_WS_URL}?token=${token}`;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (e) => this.dispatch(JSON.parse(e.data));
    this.socket.onclose   = () => this.scheduleReconnect();
    this.socket.onopen    = () => {
      this.reconnectAttempts = 0;
      this.replaySubscriptions();
      this.startHeartbeat();
    };
 
    // Throttle to single heartbeat when tab hidden (per spec edge case)
    document.addEventListener("visibilitychange", () => {
      this.isVisible = !document.hidden;
      if (this.isVisible) this.replaySubscriptions();
    });
  }
 
  subscribe(topic: string, cb: (msg: any) => void): () => void {
    if (!this.subscriptions.has(topic)) {
      this.send({ op: "subscribe", topic });
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(cb);
    return () => this.unsubscribe(topic, cb);
  }
 
  private dispatch(data: any) {
    const cbs = this.subscriptions.get(data.topic);
    cbs?.forEach((cb) => cb(data));
  }
 
  private replaySubscriptions() {
    this.subscriptions.forEach((_, topic) => {
      this.send({ op: "subscribe", topic });
    });
  }
 
  private send(payload: object) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
 
  private scheduleReconnect() {
    this.stopHeartbeat();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts++, 30000);
    setTimeout(() => {
      const token = localStorage.getItem("tradingagents-store")
        ? JSON.parse(localStorage.getItem("tradingagents-store")!).state?.token
        : null;
      if (token) this.connect(token);
    }, delay + Math.random() * 500);
  }
 
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // When tab hidden, only send heartbeat (spec: drop to single heartbeat)
      if (!this.isVisible) {
        this.send({ op: "ping" });
        return;
      }
      this.send({ op: "ping" });
    }, 10_000);
  }
 
  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }
 
  disconnect() {
    this.stopHeartbeat();
    this.socket?.close();
  }
}
 
export const wsManager = new WSManager();
 
 