import { computed, useState } from "#imports";
import type { ActorProfile } from "~~/shared/types/clawme";

export interface ActorsState {
  actors: Record<string, ActorProfile>;
  fetchedIds: Set<string>;
}

export function useActors() {
  const state = useState<ActorsState>("actors-state", () => ({
    actors: {},
    fetchedIds: new Set<string>(),
  }));

  /**
   * 根据 id 获取用户信息（从缓存读取）
   */
  function getActor(id: string): ActorProfile | undefined {
    return state.value.actors[id];
  }

  /**
   * 批量设置用户信息到缓存
   */
  function setActors(actors: ActorProfile[]) {
    for (const actor of actors) {
      state.value.actors[actor.id] = actor;
    }
  }

  /**
   * 设置单个用户信息
   */
  function setActor(actor: ActorProfile) {
    state.value.actors[actor.id] = actor;
  }

  /**
   * 检查用户信息是否已缓存
   */
  function hasActor(id: string): boolean {
    return id in state.value.actors;
  }

  /**
   * 根据 id 获取用户信息，如果不存在则从 API 获取（只获取一次）
   */
  async function fetchActor(id: string): Promise<ActorProfile | null> {
    // 已缓存则直接返回
    if (state.value.actors[id]) {
      return state.value.actors[id];
    }

    // 已经请求过但不存在，避免重复请求
    if (state.value.fetchedIds.has(id)) {
      return null;
    }

    try {
      const actor = await $fetch<ActorProfile>(`/api/actors/${id}`);
      if (actor) {
        state.value.actors[id] = actor;
      }
      state.value.fetchedIds.add(id);
      return actor;
    } catch {
      state.value.fetchedIds.add(id);
      return null;
    }
  }

  /**
   * 根据 id 列表批量获取用户信息，未缓存的会从 API 获取
   */
  async function fetchActors(ids: string[]): Promise<ActorProfile[]> {
    const results: ActorProfile[] = [];
    const toFetch: string[] = [];

    for (const id of ids) {
      if (state.value.actors[id]) {
        results.push(state.value.actors[id]);
      } else if (!state.value.fetchedIds.has(id)) {
        toFetch.push(id);
      }
    }

    if (toFetch.length > 0) {
      const fetched = await Promise.all(toFetch.map((id) => fetchActor(id)));
      results.push(...fetched.filter((a): a is ActorProfile => a !== null));
    }

    return results;
  }

  return {
    actors: computed(() => state.value.actors),
    getActor,
    setActor,
    setActors,
    hasActor,
    fetchActor,
    fetchActors,
  };
}
