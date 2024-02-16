import { createClient } from 'redis';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { redisClient } from '../main/lib/redis_client';

export async function test_index() {

//  const client = createClient({
//    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
//  });
//  await client.connect();

  const client = await redisClient();

  if(client === null) {
    console.log('Redis client not initialized');
    return;
  }

  const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    indexName: 'hr_policies',
  });

  /* Simple standalone search in the vector DB */
  const simpleRes = await vectorStore.similaritySearch('hire', 1);
  console.log("*** Simple Res ***", simpleRes);

  /* Search in the vector DB using filters */
  const filterRes = await vectorStore.similaritySearch('hire', 3, ['policy']);
  console.log("*** Filter Res ***", filterRes);

  /* Usage as part of a chain */
  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo-1106' });
  const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      "Answer the user's questions based on the below context:\n\n{context}",
    ],
    ['human', '{input}'],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt,
  });

  const chain = await createRetrievalChain({
    retriever: vectorStore.asRetriever(),
    combineDocsChain,
  });

  const chainRes = await chain.invoke({ input: 'what are leave policies' });
  console.log(chainRes);

}

test_index();
