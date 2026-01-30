import { createBullBoard } from "@bull-board/api";
import { Queue, RedisOptions } from "bullmq";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { fastify } from "fastify";
import { Logger } from "commandkit";

const redisOptions: RedisOptions = {
  url: process.env.REDIS_URL,
};

const createQueueMQ = (name: string) =>
  new Queue(name, {
    connection: redisOptions,
  });

export async function setupBullBoard() {
  const app = fastify();
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(createQueueMQ("commandkit-tasks"))],
    serverAdapter,
  });

  serverAdapter.setBasePath("/ui");

  app.register(serverAdapter.registerPlugin(), { prefix: "/ui" });

  app.listen({ host: "0.0.0.0", port: 8964 });

  Logger.info("Bull Board is running on http://localhost:8964/ui");

  process.once("SIGINT", () => {
    app.close();
    process.exit(0);
  });

  process.once("SIGTERM", () => {
    app.close();
    process.exit(0);
  });
}
