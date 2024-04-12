import { createClient } from 'redis';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { getRedisClient } from '../main/lib/redis_client';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';

export async function test_index() {
  //  const client = createClient({
  //    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  //  });
  //  await client.connect();

  const client = await getRedisClient();

  if (client === null) {
    console.log('Redis client not initialized');
    return;
  }

  const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    //    indexName: 'hr_policies',
    indexName: 'worker_hr',
  });

  /* Simple standalone search in the vector DB */
  const simpleRes = await vectorStore.similaritySearch('hire', 1);
  //  console.log("*** Simple Res ***", simpleRes);

  /* Search in the vector DB using filters */
  const filterRes = await vectorStore.similaritySearch('hire', 3, ['policy']);
  //  console.log("*** Filter Res ***", filterRes);

  /* Usage as part of a chain */
  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo-1106' });
  const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `Answer the user's questions based on the below context:\n\n{context} \
      If the question is related to employee's data, consider the Employee_ID that is part of {employeeID} \
      to answer the question. If context doesn't have employee ID, say that you don't have information. \
      `,
    ],
    ['human', '{input}'],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt,
  });

  const employeeId = '21036';
  const retriever = new VectorStoreRetriever({
    vectorStore: vectorStore,
    k: 20,
    //    filter: [employeeId],
    searchType: 'similarity',
  });

  const chain = await createRetrievalChain({
    retriever: retriever,
    combineDocsChain,
  });

  //  const input = "who are the employees with manager as Joy Banks";
  //  const input = "who is chief data officer";
  //  const input = "who are all the possible direct reports of Joey Kowalski? Sort them in alphabetical order. List them in sequential numbers";
  const input =
    'list all the employees with age more than 60 along with their age and department';

  const chainRes = await chain.invoke({ input: input, employeeID: employeeId });
  console.log(chainRes);

  //  const docs = await retriever.getRelevantDocuments('Lisa Woolbright');
  //  console.log('\n *** Relevant Docs ***', docs);
}

test_index();
