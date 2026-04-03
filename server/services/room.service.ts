import { eq, inArray } from "drizzle-orm";
import type { UserProfile, ChatRoomRecord, SessionType } from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";

const { roomMembers, rooms, users } = schema;

type UserRecord = typeof users.$inferSelect;
type RoomRecord = typeof rooms.$inferSelect;

export interface CreateRoomInput {
  creatorId: string;
  memberIds: string[];
  title?: string;
}

export function normalizeRoomType(roomType: string | null | undefined): SessionType {
  return roomType === "group" ? "group" : "direct";
}

export function mapUserToUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    type: user.type,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    intro: user.intro,
    role: user.role,
    catchphrase: user.catchphrase,
    modelConfigId: user.modelConfigId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function mapRoomToChatRoomRecord(
  room: RoomRecord,
  memberIds: string[],
): ChatRoomRecord {
  return {
    id: room.id,
    type: normalizeRoomType(room.type),
    title: room.name || "",
    memberIds,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function getUserProfileById(
  userId: string,
): Promise<UserProfile | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user ? mapUserToUserProfile(user) : null;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const usersList = await db.query.users.findMany({
    where: inArray(users.type, ["human", "bot", "acpx"]),
  });

  return usersList.map(mapUserToUserProfile);
}

export async function createRoom(
  input: CreateRoomInput,
): Promise<ChatRoomRecord> {
  const memberIds = Array.from(
    new Set(input.memberIds.filter((memberId) => memberId !== input.creatorId)),
  );

  if (memberIds.length === 0) {
    throw new Error("memberIds must contain at least one user");
  }

  const uniqueUserIds = [input.creatorId, ...memberIds];
  const usersData = await db.query.users.findMany({
    where: inArray(users.id, uniqueUserIds),
  });

  if (usersData.length !== uniqueUserIds.length) {
    throw new Error("Failed to resolve all room members");
  }

  const userMap = new Map(usersData.map((user) => [user.id, user]));
  const creator = userMap.get(input.creatorId);

  if (!creator) {
    throw new Error("Creator not found");
  }

  const selectedMembers = memberIds
    .map((memberId) => userMap.get(memberId))
    .filter((user): user is UserRecord => Boolean(user));

  if (selectedMembers.length !== memberIds.length) {
    throw new Error("Failed to resolve all room members");
  }

  const roomType: SessionType = memberIds.length === 1 ? "direct" : "group";
  const roomTitle = input.title?.trim() || buildRoomTitle(creator, selectedMembers);

  const room = await db.transaction(async (tx) => {
    const [createdRoom] = await tx
      .insert(rooms)
      .values({
        type: roomType,
        name: roomTitle,
      })
      .returning();

    if (!createdRoom) {
      throw new Error("Failed to create room");
    }

    await tx.insert(roomMembers).values([
      { roomId: createdRoom.id, userId: creator.id, role: "owner" },
      ...selectedMembers.map((member) => ({
        roomId: createdRoom.id,
        userId: member.id,
        role: "member" as const,
      })),
    ]);

    return createdRoom;
  });

  return mapRoomToChatRoomRecord(room, uniqueUserIds);
}

export async function createRoomAsync(
  input: CreateRoomInput,
): Promise<ChatRoomRecord> {
  return await createRoom(input);
}

function buildRoomTitle(creator: UserRecord, members: UserRecord[]) {
  if (members.length === 1) {
    return `${creator.nickname} x ${members[0]?.nickname ?? "成员"}`;
  }

  const participantNames = [creator.nickname, ...members.map((member) => member.nickname)];

  if (participantNames.length <= 3) {
    return participantNames.join("、");
  }

  return `${participantNames.slice(0, 3).join("、")} 等 ${participantNames.length} 人`;
}
