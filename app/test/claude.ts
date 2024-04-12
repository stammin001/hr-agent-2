import { ChatAnthropic } from '@langchain/anthropic';
import { ChatAnthropicMessages } from '@langchain/anthropic';
import {
  BaseMessage,
  AIMessage,
  ChatMessage,
  HumanMessage,
  FunctionMessage,
} from '@langchain/core/messages';
import Anthropic from '@anthropic-ai/sdk';

import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '..', '..', '.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('Error loading .env file');
  throw result.error;
}

const model = new ChatAnthropic({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  modelName: 'claude-3-haiku-20240307',
});

export async function testClaude() {
  const response = await model.invoke([new HumanMessage('Hello world!')]);
  console.log(response.content);
}

const anthropic = new Anthropic();

async function main() {
  //const modelName = 'claude-3-opus-20240229';
  const modelName = 'claude-3-haiku-20240307';
  const stream = await anthropic.messages.create({
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello, Claude' }],
    model: modelName,
    stream: true,
  });

  for await (const messageStreamEvent of stream) {
    console.log(messageStreamEvent.type);
  }
}

async function main_2() {
  const stream = anthropic.messages
    .stream({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, Claude',
        },
      ],
    })
    .on('text', (text) => {
      console.log(text);
    });

  const message = await stream.finalMessage();
  console.log('final message', message);
}

testClaude();

//main_2();

