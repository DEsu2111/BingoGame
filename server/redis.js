import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export async function setupRedisAdapter(io, redisUrl) {
  if (!redisUrl) {
    return null;
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  const stateClient = pubClient.duplicate();

  pubClient.on('error', (error) => {
    console.error('Redis pub client error:', error);
  });
  subClient.on('error', (error) => {
    console.error('Redis sub client error:', error);
  });
  stateClient.on('error', (error) => {
    console.error('Redis state client error:', error);
  });

  await Promise.all([pubClient.connect(), subClient.connect(), stateClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  return { pubClient, subClient, stateClient };
}

export async function closeRedisAdapter(clients) {
  if (!clients) return;
  const jobs = [clients.pubClient?.quit(), clients.subClient?.quit(), clients.stateClient?.quit()].filter(Boolean);
  await Promise.allSettled(jobs);
}
