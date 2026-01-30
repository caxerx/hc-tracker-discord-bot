import { createBullBoard } from "@bull-board/api";
import { Queue, RedisOptions } from "bullmq";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { fastify } from "fastify";

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

  const tasksQueue = createQueueMQ("commandkit-tasks");

  createBullBoard({
    queues: [new BullMQAdapter(tasksQueue)],
    serverAdapter,
  });

  serverAdapter.setBasePath("/ui");

  app.register(serverAdapter.registerPlugin(), { prefix: "/ui" });

  app.listen({ host: "0.0.0.0", port: 8964 });

  console.log("Bull Board is running on http://localhost:8964/ui");
}
