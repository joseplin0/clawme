import { useUserSession } from "#imports";
import { toUIMessageRole } from "~~/shared/types/clawme";
import {
  WebSocketChatTransport,
  type WebSocketConnectionState,
} from "./WebSocketChatTransport";

/**
 * 全局 WebSocket Transport 实例
 */
let transportInstance: WebSocketChatTransport<any> | null = null;

/**
 * 获取 WebSocket URL
 */
function getWebSocketUrl(): string {
  const config = useRuntimeConfig();
  const wsUrl =
    typeof config.public.wsUrl === "string" ? config.public.wsUrl : "";
  // 优先使用配置中的 WS URL，否则根据当前页面协议自动推断
  if (wsUrl) {
    return wsUrl;
  }

  // 在浏览器环境中自动推断
  if (import.meta.client) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/ws/chat`;
  }

  // 服务端渲染时返回空字符串（会在客户端重新连接）
  return "";
}

/**
 * 获取或创建 WebSocket Transport 实例
 */
function getTransport(): WebSocketChatTransport<any> {
  if (!transportInstance) {
    const url = getWebSocketUrl();
    transportInstance = new WebSocketChatTransport({
      url,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
    });
  }
  return transportInstance;
}

/**
 * WebSocket 聊天客户端 composable
 */
export function useChatClient() {
  const { loggedIn } = useUserSession();
  const toast = useToast();
  const transport = getTransport();
  const connectionState = ref<WebSocketConnectionState>("disconnected");
  const reconnectAttempted = ref(false);

  // 监听连接状态变化
  onMounted(() => {
    const unsubscribe = transport.onStateChange((state) => {
      connectionState.value = state;

      // 仅在 transport 明确进入重连态时提示，避免业务性关闭误报为网络重连。
      if (state === "reconnecting" && loggedIn.value && !reconnectAttempted.value) {
        reconnectAttempted.value = true;
        toast.add({
          title: "连接已断开",
          description: "正在尝试重新连接...",
          color: "warning",
          icon: "i-lucide-wifi-off",
        });
      }

      // 重连成功时显示提示
      if (state === "connected" && reconnectAttempted.value) {
        toast.add({
          title: "已重新连接",
          description: "网络连接已恢复",
          color: "success",
          icon: "i-lucide-wifi",
        });
        reconnectAttempted.value = false;
      }
    });

    onUnmounted(unsubscribe);
  });

  /**
   * 发送消息到指定会话
   */
  async function sendMessage(
    sessionId: string,
    content: string,
  ): Promise<ReadableStream<any> | null> {
    if (!loggedIn.value) {
      toast.add({
        title: "未登录",
        description: "请先登录后再发送消息",
        color: "error",
        icon: "i-lucide-log-in",
      });
      return null;
    }

    try {
      const stream = await transport.sendMessages({
        trigger: "submit-message",
        chatId: sessionId,
        messageId: undefined,
        messages: [{
          id: crypto.randomUUID(),
          role: toUIMessageRole("USER"),
          parts: [{ type: "text", text: content }],
        }] as any,
        abortSignal: undefined,
      });

      return stream;
    } catch (error) {
      toast.add({
        title: "发送失败",
        description: error instanceof Error ? error.message : "消息发送失败",
        color: "error",
        icon: "i-lucide-alert-circle",
      });
      return null;
    }
  }

  /**
   * 创建新会话并发送首条消息
   */
  async function createSessionAndSend(
    targetUserId: string,
    content: string,
  ): Promise<{ stream: ReadableStream<any> | null; sessionId: Promise<string | null> }> {
    if (!loggedIn.value) {
      toast.add({
        title: "未登录",
        description: "请先登录后再发送消息",
        color: "error",
        icon: "i-lucide-log-in",
      });
      return { stream: null, sessionId: Promise.resolve(null) };
    }

    try {
      const result = await transport.sendMessageToUser({ targetUserId, content });
      return { stream: result.stream, sessionId: result.sessionId };
    } catch (error) {
      toast.add({
        title: "创建会话失败",
        description: error instanceof Error ? error.message : "会话创建失败",
        color: "error",
        icon: "i-lucide-alert-circle",
      });
      return { stream: null, sessionId: Promise.resolve(null) };
    }
  }

  /**
   * 发送正在输入状态
   */
  async function sendTyping(sessionId: string): Promise<void> {
    if (!loggedIn.value) return;
    await transport.sendTyping(sessionId);
  }

  /**
   * 发送消息已读状态
   */
  async function sendRead(sessionId: string, messageId: string): Promise<void> {
    if (!loggedIn.value) return;
    await transport.sendRead(sessionId, messageId);
  }

  /**
   * 监听来自其他用户的消息
   */
  function onIncomingMessage(
    callback: (chatId: string, message: any, sessionId?: string) => void,
  ): () => void {
    return transport.onIncomingMessage(callback);
  }

  /**
   * 手动重连
   */
  async function reconnect(): Promise<void> {
    reconnectAttempted.value = true;
    transport.close();
    // 下次发送消息时会自动重连
  }

  /**
   * 关闭连接
   */
  function close(): void {
    transport.close();
  }

  /**
   * 检查连接是否可用
   */
  const isConnected = computed(
    () => connectionState.value === "connected",
  );

  return {
    // 状态
    connectionState,
    isConnected,

    // 方法
    sendMessage,
    createSessionAndSend,
    sendTyping,
    sendRead,
    onIncomingMessage,
    reconnect,
    close,

    // 原始 transport（高级用法）
    transport,
  };
}

/**
 * 全局 WebSocket 客户端（单例）
 */
export function useGlobalChatClient() {
  return useChatClient();
}
