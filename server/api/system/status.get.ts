import { isSystemInitialized } from "~~/server/utils/system-config";

export default defineEventHandler(async () => {
  return {
    isInitialized: await isSystemInitialized(),
  };
});
