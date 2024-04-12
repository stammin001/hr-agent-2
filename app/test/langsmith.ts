import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'langsmith';

const envPath = path.resolve(__dirname, '..', '..', '.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('Error loading .env file');
  throw result.error;
}

export async function test_ls() {
  const tracer = new LangChainTracer({ projectName: 'test-2' });
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      "You are a helpful assistant. Please respond to the user's request only based on the given context.",
    ],
    ['user', 'Question: {question}\nContext: {context}'],
  ]);
  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo' });
  const outputParser = new StringOutputParser();

  const chain = prompt
    .pipe(model)
    .pipe(outputParser)
    .withConfig({
      tags: ['top-level-tag'],
      metadata: { 'top-level-key': 'top-level-value' },
    });

  const question = "Can you summarize this morning's meetings?";
  const context =
    "During this morning's meeting, we solved all world conflict.";
  console.log('Testing Langsmith : Project = ', process.env.LANGCHAIN_PROJECT);

  const ls_client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  });

  const callbacks = [
    new LangChainTracer({
      projectName: process.env.LANGCHAIN_PROJECT,
      client: new Client({}),
    }),
  ];

  await chain.invoke(
    { question: question, context: context },
    { callbacks: callbacks },
  );
}

test_ls();
