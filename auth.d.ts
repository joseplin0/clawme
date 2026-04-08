import type { OwnerSessionUser } from "~~/server/utils/auth";

declare module "#auth-utils" {
  interface User {
    id: OwnerSessionUser["id"];
    username: OwnerSessionUser["username"];
    nickname: OwnerSessionUser["nickname"];
    role: OwnerSessionUser["role"];
  }
}
