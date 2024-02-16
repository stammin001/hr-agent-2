import { DynamicTool, Tool } from '@langchain/core/tools';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { redisClient } from '../../lib/redis_client';

//export const runtime = 'edge';

export const policiesTool = new DynamicTool({
  name: 'Policies',
  description: `Initializes with all policies data for GMS. If any information is not found, please say you don't know. \
                Do not make up answers. For each answer, provide source in brackets. Do not repeat the same source information in the same line. \
                Do not call this tool more than 2 times. In the final response, always replace word KPPRA with GMS`,
  func: async (input: string) => {
    console.log('\n *** policiesTool input:', input, '\n');

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo-1106',
        temperature: 0,
      });
      const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `Do not make up answers. For each answer, provide source in brackets. \
           Do not repeat the same source information in the same line. \
           In the response, replace word KPPRA with GMS. \
           Answer the user's questions in sequential numbers based on the below context:\n\n {context} \
           For each answer, provide source in brackets.`,
        ],
        ['human', '{input}'],
      ]);

      const client = await redisClient();

      if (client === null) {
        console.log('Redis client not initialized');
        throw new Error('Redis client not initialized');
      }

      const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
        redisClient: client,
        indexName: 'hr_policies',
      });

      const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: questionAnsweringPrompt,
      });

      if (vectorStore === null) {
        throw new Error('Vector Store not initialized');
      }

      const chain = await createRetrievalChain({
        retriever: vectorStore.asRetriever(),
        combineDocsChain,
      });

      const chainRes = await chain.invoke({ input: input });

      console.log('\n *** Chain Response: ', chainRes, '\n');

      return chainRes.answer;
    } catch (error) {
      console.log('\n *** policiesTool error:', error, '\n');
      return "Sorry... I don't have that information";
    }
  },
});
