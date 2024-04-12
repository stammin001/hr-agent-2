import { ChatPromptTemplate } from '@langchain/core/prompts';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { getRedisClient } from './redis_client';

export async function getRetrievalChain(
  questionAnsweringPrompt: ChatPromptTemplate,
  indexName: string,
  employeeId?: string[],
) {
  const client = await getRedisClient();

  if (client === null) {
    console.log('Redis client not initialized');
    throw new Error('Redis client not initialized');
  }

  const model = new ChatOpenAI({
    modelName: process.env.GLOBAL_MODEL_NAME,
    temperature: 0,
  });

  const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    indexName: indexName,
  });

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt,
  });

  if (vectorStore === null) {
    throw new Error('Vector Store not initialized');
  }

  const retriever = new VectorStoreRetriever({
    vectorStore: vectorStore,
    k: 5,
    //    filter: employeeId,
    searchType: 'similarity',
  });

  const chain = await createRetrievalChain({
    retriever: retriever,
    combineDocsChain,
  });

  return chain;
}

export async function getRelevantData(searchTerm: string, indexName: string) {
  const client = await getRedisClient();
  console.log("Search Term: ", searchTerm, "Index Name: ", indexName);
  
  if (client === null) {
    console.log('Redis client not initialized');
    throw new Error('Redis client not initialized');
  }

  const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    indexName: indexName,
  });

  if (vectorStore === null) {
    throw new Error('Vector Store not initialized');
  }

  const retriever = new VectorStoreRetriever({
    vectorStore: vectorStore,
    k: 5,
    searchType: 'similarity',
  });

  const results = await retriever.getRelevantDocuments(searchTerm);
  var response = '';
  for (const result of results) {
//    console.log('result.pageContent:', result.pageContent);
    response += result.pageContent + '\n';
  }
  return response;
}
