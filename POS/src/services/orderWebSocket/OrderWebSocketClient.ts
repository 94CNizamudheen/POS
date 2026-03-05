import type { WsMessage, WsMessageType, TerminalType } from "@/types/order";

export type OrderMessageHandler = (message: WsMessage<any>) => void;

export class OrderWebSocketClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly terminalId: string;
  private readonly terminalType: TerminalType;

  private messageHandlers: Map<string, OrderMessageHandler[]> = new Map();

  private reconnectAttempts = 0;
  private readonly INITIAL_RECONNECT_DELAY = 2000;
  private readonly MAX_RECONNECT_DELAY = 30_000;
  private currentReconnectDelay = 2000;
  private isIntentionallyClosed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionChangeCallback: ((connected: boolean) => void) | null = null;

  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly HEARTBEAT_INTERVAL = 10_000;
  private readonly HEARTBEAT_TIMEOUT = 5_000;

  constructor(url: string, terminalId: string, terminalType: TerminalType) {
    this.url = url;
    this.terminalId = terminalId;
    this.terminalType = terminalType;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[OrderWS] Connecting to ${this.url} as ${this.terminalId}`);
        this.ws = new WebSocket(this.url);
        this.isIntentionallyClosed = false;

        let hasResolved = false;

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            if (!hasResolved) {
              hasResolved = true;
              reject(new Error("Connection timeout"));
            }
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          hasResolved = true;
          this.reconnectAttempts = 0;
          this.currentReconnectDelay = this.INITIAL_RECONNECT_DELAY;
          console.log(`[OrderWS] Connected`);

          // Identify with server
          this.send("IDENTIFY", { terminalId: this.terminalId, type: this.terminalType });
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as WsMessage<any>;

            // Handle pong — clear heartbeat timeout
            if (msg.type === "PONG") {
              this.clearHeartbeatTimeout();
              return;
            }

            this.handleMessage(msg);
          } catch {
            // ignore parse errors
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(connectionTimeout);
          if (!hasResolved) {
            hasResolved = true;
            reject(err);
          }
        };

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          this.connectionChangeCallback?.(false);

          if (!hasResolved) {
            hasResolved = true;
            reject(new Error("Closed before open"));
            return;
          }

          if (!this.isIntentionallyClosed) {
            this.reconnectAttempts++;
            const delay = this.currentReconnectDelay;
            this.currentReconnectDelay = Math.min(
              this.currentReconnectDelay * 2,
              this.MAX_RECONNECT_DELAY,
            );

            console.log(
              `[OrderWS] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`,
            );

            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect()
                .then(() => {
                  this.reconnectAttempts = 0;
                  this.currentReconnectDelay = this.INITIAL_RECONNECT_DELAY;
                  this.connectionChangeCallback?.(true);
                })
                .catch(console.error);
            }, delay);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send<T>(type: WsMessageType, payload: T): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: WsMessage<T> = {
        type,
        payload,
        timestamp: Date.now(),
        messageId: crypto.randomUUID(),
      };
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn(`[OrderWS] Not connected — skipped ${type}`);
    }
  }

  on(messageType: WsMessageType | "*", handler: OrderMessageHandler): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  off(messageType: WsMessageType | "*", handler: OrderMessageHandler): void {
    const handlers = this.messageHandlers.get(messageType);
    if (!handlers) return;
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  }

  private handleMessage(msg: WsMessage<any>): void {
    const specific = this.messageHandlers.get(msg.type);
    specific?.forEach((h) => h(msg));

    const wildcard = this.messageHandlers.get("*");
    wildcard?.forEach((h) => h(msg));
  }

  // Heartbeat — ping every 10s, expect pong within 5s
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("PING", {});
        this.heartbeatTimeout = setTimeout(() => {
          console.warn("[OrderWS] Heartbeat timeout — closing connection");
          this.ws?.close();
        }, this.HEARTBEAT_TIMEOUT);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clearHeartbeatTimeout();
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  forceReconnect(): void {
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = this.INITIAL_RECONNECT_DELAY;
    this.isIntentionallyClosed = false;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.connect()
      .then(() => this.connectionChangeCallback?.(true))
      .catch(console.error);
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getTerminalId(): string {
    return this.terminalId;
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionChangeCallback = callback;
  }
}
