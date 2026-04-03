import type { OwnerSessionUser } from "~~/server/utils/auth";

declare module "#auth-utils" {
  type User = OwnerSessionUser;
}
