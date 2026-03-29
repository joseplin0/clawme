import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod";
import type { CreateRoomRequest, CreateRoomResponse } from "~~/shared/types/clawme";
import { requireOwnerSession } from "~~/server/utils/auth";
import { createRoom } from "~~/server/services/room.service";

const bodySchema = z.object({
  memberIds: z.array(z.uuid()).min(1),
});

export default defineEventHandler(async (event) => {
  const ownerUser = await requireOwnerSession(event);
  const body = await readBody<CreateRoomRequest>(event);
  const { memberIds } = bodySchema.parse(body);

  try {
    return (await createRoom({
      creatorId: ownerUser.id,
      memberIds,
    })) as CreateRoomResponse;
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage:
        error instanceof Error ? error.message : "Failed to create room",
    });
  }
});
