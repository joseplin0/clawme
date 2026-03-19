import { defineEventHandler } from "h3";
import { requireOwnerSession } from "~~/server/utils/auth";
import { prisma } from "~~/server/utils/db";
import { ParticipantRole } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const { state, owner, bot } = await requireOwnerSession(event);

  // Create a new session with the bot
  const session = await prisma.chatSession.create({
    data: {
      type: "DIRECT",
      title: `${owner?.nickname ?? "用户"} x ${bot?.nickname ?? "助手"}`,
      participants: {
        create: [
          { userId: owner!.id, role: ParticipantRole.OWNER },
          ...(bot ? [{ userId: bot.id, role: ParticipantRole.MEMBER }] : []),
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  return {
    id: session.id,
    title: session.title,
    type: session.type,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
});
