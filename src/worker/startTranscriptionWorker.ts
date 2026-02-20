import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

async function waitForRedis(): Promise<void> {
  const IORedis = (await import("ioredis")).default;
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: () => null,
    connectTimeout: 10000,
    ...(REDIS_URL.startsWith("rediss://") && {
      tls: { rejectUnauthorized: true },
    }),
  });

  return new Promise((resolve, reject) => {
    const done = (err: Error | null) => {
      client.disconnect();
      if (err) reject(err);
      else resolve();
    };
    client.on("ready", () => done(null));
    client.on("error", (err) => done(err));
  });
}

async function main() {
  try {
    await waitForRedis();
  } catch (err) {
    console.error("\n❌ Could not connect to Redis at", REDIS_URL);
    console.error("   Make sure Redis is running, e.g.:");
    console.error("   docker start my-redis");
    console.error("   (Start Docker Desktop first if needed.)\n");
    process.exit(1);
  }
  await import("./transcriptionWorker");
}

main();

