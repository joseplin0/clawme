import type { OwnerSessionUser } from "~~/server/utils/auth";

declare module "#auth-utils" {
  interface User extends OwnerSessionUser {}
}
