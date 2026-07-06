import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  splitting: false,
  external: ['fastify', '@fastify/*', 'ws', 'prisma', '@prisma/client', 'events', 'node:*'],
});
