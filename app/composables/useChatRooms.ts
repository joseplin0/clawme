import {
  computed,
  navigateTo,
  useNuxtApp,
  useRequestFetch,
  useRoute,
  useState,
  useUserSession,
} from "#imports";
import type { ChatRoomRecord } from "~~/shared/types/clawme";

interface RoomListResponse {
  rooms: ChatRoomRecord[];
  activeRoomId: string | null;
}

interface ChatRoomsState {
  rooms: ChatRoomRecord[];
  activeRoomId: string | null;
  pending: boolean;
  initialized: boolean;
}

let roomsRequest: Promise<void> | null = null;

export function useChatRooms() {
  const session = useUserSession();
  const nuxtApp = useNuxtApp();
  const requestFetch = useRequestFetch();
  const serverFetch = requestFetch as (url: string) => Promise<unknown>;
  const route = useRoute();
  const state = useState<ChatRoomsState>("chat-rooms-state", () => ({
    rooms: [],
    activeRoomId: null,
    pending: false,
    initialized: false,
  }));

  async function fetchRooms(force = false) {
    if (state.value.pending && roomsRequest) {
      return roomsRequest;
    }

    if (!force && state.value.initialized) {
      return;
    }

    state.value.pending = true;

    roomsRequest = (async () => {
      try {
        const response = await fetchChatRooms();

        state.value.rooms = response.rooms;

        const hasSelectedRoom = response.rooms.some(
          (room) => room.id === state.value.activeRoomId,
        );

        state.value.activeRoomId = hasSelectedRoom
          ? state.value.activeRoomId
          : (response.activeRoomId ?? response.rooms[0]?.id ?? null);
        state.value.initialized = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number; status?: number }).statusCode
          ?? (error as { statusCode?: number; status?: number }).status;

        if (statusCode === 401) {
          await handleUnauthorized();
          return;
        }

        throw error;
      } finally {
        state.value.pending = false;
        roomsRequest = null;
      }
    })();

    return roomsRequest;
  }

  function setActiveRoomId(roomId: string | null) {
    state.value.activeRoomId = roomId;
  }

  function upsertRoom(room: ChatRoomRecord) {
    state.value.rooms = [
      room,
      ...state.value.rooms.filter((item) => item.id !== room.id),
    ];
    state.value.activeRoomId = room.id;
    state.value.initialized = true;
  }

  async function fetchChatRooms(): Promise<RoomListResponse> {
    if (import.meta.server) {
      return await serverFetch("/api/chat/room") as RoomListResponse;
    }

    return await $fetch<RoomListResponse>("/api/chat/room");
  }

  async function handleUnauthorized() {
    state.value.rooms = [];
    state.value.activeRoomId = null;
    state.value.initialized = false;

    try {
      await session.clear();
    } catch {
      session.session.value = null;
    }

    if (import.meta.client && route.path !== "/login") {
      await nuxtApp.runWithContext(() => navigateTo("/login", { replace: true }));
    }
  }

  return {
    rooms: computed(() => state.value.rooms),
    activeRoomId: computed({
      get: () => state.value.activeRoomId,
      set: setActiveRoomId,
    }),
    pending: computed(() => state.value.pending),
    initialized: computed(() => state.value.initialized),
    fetchRooms,
    setActiveRoomId,
    upsertRoom,
  };
}
