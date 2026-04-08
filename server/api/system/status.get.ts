import { isSystemInitialized } from "~~/server/utils/system-config";
import { getStartupDiagnostics } from "~~/server/utils/startup-check";

export default defineEventHandler(async () => {
  return {
    isInitialized: await isSystemInitialized(),
    startup: getStartupDiagnostics(),
  };
});
