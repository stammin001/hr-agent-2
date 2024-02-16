import { createClient } from 'redis';
import { config } from 'dotenv';
config();

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => console.log('Redis Client Error', err));

export async function test() {
  await client.connect();
  console.log('Redis connected');

  await client.set('test', 'Hello World');
  const result = await client.get('test');
  console.log('Redis test result', result);
}

export async function test_hash() {
  await client.connect();
  console.log('Redis connected');

  await client.hSet('test_hash', 'key1', 'value1_1');
  await client.hSet('test_hash', 'key2', 'value2_2');

  const result = await client.hGetAll('test_hash');
  console.log('Redis test_hash result', result);

  await client.quit();

  try {
    await client.get('key');
  } catch (err) {
    console.log('Error:', err);
  }
}

export async function test_index() {
    await client.connect();
    console.log('Redis connected');
  
    await client.quit();
}

test_index();
