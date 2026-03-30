type LocalStorageDriver = {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare function useStorage(base?: string): LocalStorageDriver;

const STORAGE_KEY = "config";

interface StoredSystemConfig {
  isInitialized: boolean;
  createdAt: string;
  updatedAt: string;
}

function createDefaultSystemConfig(
  now = new Date().toISOString(),
): StoredSystemConfig {
  return {
    isInitialized: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function readPersistedSystemConfig(): Promise<StoredSystemConfig | null> {
  const storage = useStorage("data");
  const stored = await storage.getItem<StoredSystemConfig>(STORAGE_KEY);
  return stored;
}

export async function readSystemConfig(): Promise<StoredSystemConfig> {
  const stored = await readPersistedSystemConfig();
  if (stored) {
    return stored;
  }

  return createDefaultSystemConfig();
}

export async function isSystemInitialized(): Promise<boolean> {
  const config = await readSystemConfig();
  return config.isInitialized;
}

export async function setSystemInitialized(
  isInitialized: boolean,
): Promise<StoredSystemConfig> {
  const storage = useStorage("data");
  const existing = await readSystemConfig();
  const now = new Date().toISOString();
  const nextConfig: StoredSystemConfig = {
    isInitialized,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.setItem(STORAGE_KEY, nextConfig);

  return nextConfig;
}
