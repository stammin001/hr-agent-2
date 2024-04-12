import { createClient } from 'redis';

export async function getRedisClient() {

    try {
      const client = createClient({ url: process.env.REDIS_URL });
//      console.log('\n *** Redis_VS client:', client, '\n');
  
      if(!client.isOpen)
        await client.connect();

      return client;  
    } catch (error) {
      console.log('\n *** Redis_VS error:', error, '\n');
      return null;
    }
};
