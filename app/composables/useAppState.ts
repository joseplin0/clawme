import { computed, useState } from "#imports";
import type { UserProfile } from "~~/shared/types/clawme";

export interface UsersState {
  users: Record<string, UserProfile>;
  fetchedIds: Set<string>;
}

export function useUsers() {
  const state = useState<UsersState>("users-state", () => ({
    users: {},
    fetchedIds: new Set<string>(),
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
    }
  }

  /**
   * 设置单个用户信息
   */
  function setUser(user: UserProfile) {
    state.value.users[user.id] = user;
  }

  /**
   * 检查用户信息是否已缓存
   */
  function hasUser(id: string): boolean {
    return id in state.value.users;
  }

  /**
   * 根据 id 获取用户信息，如果不存在则从 API 获取（只获取一次）
   */
  async function fetchUser(id: string): Promise<UserProfile | null> {
    // 已缓存则直接返回
    if (state.value.users[id]) {
      return state.value.users[id];
    }

    // 已经请求过但不存在，避免重复请求
    if (state.value.fetchedIds.has(id)) {
      return null;
    }

    try {
      const user = await $fetch<UserProfile>(`/api/users/${id}`);
      if (user) {
        state.value.users[id] = user;
      }
      state.value.fetchedIds.add(id);
      return user;
    } catch {
      state.value.fetchedIds.add(id);
      return null;
    }
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
    fetchUser,
    fetchUsers,
  };
}
