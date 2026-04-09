import { computed, useState } from "#imports";
import type { UserProfile } from "~~/shared/types/clawme";

const USER_CACHE_TTL_MS = 60 * 1000;

export interface UsersState {
  users: Record<string, UserProfile>;
  fetchedIds: Set<string>;
  fetchedAt: Record<string, number>;
  pending: Record<string, Promise<UserProfile | null>>;
}

function omitKey<TValue>(record: Record<string, TValue>, key: string) {
  const { [key]: _omitted, ...rest } = record;
  return rest;
}

export function useUsers() {
  const state = useState<UsersState>("users-state", () => ({
    users: {},
    fetchedIds: new Set<string>(),
    fetchedAt: {},
    pending: {},
  }));

  /**
   * 根据 id 获取用户信息（从缓存读取）
   */
  function getUser(id: string): UserProfile | undefined {
    return state.value.users[id];
  }

  /**
   * 批量设置用户信息到缓存
   */
  function setUsers(users: UserProfile[]) {
    for (const user of users) {
      state.value.users[user.id] = user;
      state.value.fetchedIds.add(user.id);
      state.value.fetchedAt[user.id] = Date.now();
    }
  }

  /**
   * 设置单个用户信息
   */
  function setUser(user: UserProfile) {
    state.value.users[user.id] = user;
    state.value.fetchedIds.add(user.id);
    state.value.fetchedAt[user.id] = Date.now();
  }

  /**
   * 检查用户信息是否已缓存
   */
  function hasUser(id: string): boolean {
    return id in state.value.users;
  }

  function isStale(id: string, ttlMs: number = USER_CACHE_TTL_MS): boolean {
    const fetchedAt = state.value.fetchedAt[id];
    if (!fetchedAt) {
      return true;
    }

    return Date.now() - fetchedAt > ttlMs;
  }

  function invalidateUser(id: string) {
    state.value.fetchedAt = omitKey(state.value.fetchedAt, id);
    state.value.fetchedIds.delete(id);
  }

  function clearUser(id: string) {
    state.value.users = omitKey(state.value.users, id);
    state.value.fetchedAt = omitKey(state.value.fetchedAt, id);
    state.value.pending = omitKey(state.value.pending, id);
    state.value.fetchedIds.delete(id);
  }

  async function requestUser(id: string): Promise<UserProfile | null> {
    const pending = state.value.pending[id];
    if (pending) {
      return pending;
    }

    const request = $fetch<UserProfile>(`/api/users/${id}`)
      .then((user) => {
        if (user) {
          state.value.users[id] = user;
          state.value.fetchedAt[id] = Date.now();
        }
        state.value.fetchedIds.add(id);
        return user;
      })
      .catch(() => {
        state.value.fetchedIds.add(id);
        return null;
      })
      .finally(() => {
        state.value.pending = omitKey(state.value.pending, id);
      });

    state.value.pending[id] = request;
    return request;
  }

  /**
   * 根据 id 获取用户信息，如果不存在则从 API 获取（只获取一次）
   */
  async function fetchUser(id: string): Promise<UserProfile | null> {
    if (state.value.users[id]) {
      return state.value.users[id];
    }

    if (state.value.fetchedIds.has(id)) {
      return null;
    }

    return requestUser(id);
  }

  async function refreshUser(id: string): Promise<UserProfile | null> {
    return requestUser(id);
  }

  async function ensureUser(
    id: string,
    options?: { force?: boolean; ttlMs?: number },
  ): Promise<UserProfile | null> {
    const force = options?.force ?? false;
    const ttlMs = options?.ttlMs ?? USER_CACHE_TTL_MS;
    const cached = state.value.users[id];

    if (force) {
      return refreshUser(id);
    }

    if (cached) {
      if (isStale(id, ttlMs)) {
        void refreshUser(id);
      }
      return cached;
    }

    return fetchUser(id);
  }

  /**
   * 根据 id 列表批量获取用户信息，未缓存的会从 API 获取
   */
  async function fetchUsers(ids: string[]): Promise<UserProfile[]> {
    const results: UserProfile[] = [];
    const toFetch: string[] = [];

    for (const id of ids) {
      if (state.value.users[id]) {
        results.push(state.value.users[id]);
      } else if (!state.value.fetchedIds.has(id)) {
        toFetch.push(id);
      }
    }

    if (toFetch.length > 0) {
      const fetched = await Promise.all(toFetch.map((id) => fetchUser(id)));
      results.push(...fetched.filter((u): u is UserProfile => u !== null));
    }

    return results;
  }

    return {
      users: computed(() => state.value.users),
      getUser,
      setUser,
      setUsers,
      hasUser,
      isStale,
      invalidateUser,
      clearUser,
      fetchUser,
      refreshUser,
      ensureUser,
      fetchUsers,
    };
}
