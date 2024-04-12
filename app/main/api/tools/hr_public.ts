import { DynamicTool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { getRetrievalChain, getRelevantData } from '../../lib/redis_vectorstore';
import { auth } from '@/auth';

export const HRPublicTool = new DynamicTool({
  name: 'HR_Public_Data',
  description: `Use to retrieve HR Public data of other employees. If any information is not found, \
                please use this tool as the default tool to look for the data needed. \
                Do not make up answers. `,
  func: async (input: string) => {
    console.log('\n *** HRPublicTool input:', input, '\n');
    const session = await auth();
    const employeeId = session?.user.id?.toString();
  
    try {

      return await getRelevantData(input, 'worker_hr');

    } catch (error) {
      console.log('\n *** policiesTool error:', error, '\n');
      return "Sorry... I don't have that information";
    }
  },
});

async function dummyFunction(input: string) {
  const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `Answer the user's questions based on the below context:\n\n {context} \
       `,
    ],
    ['human', '{input}'],
  ]);

  const chain = await getRetrievalChain(
    questionAnsweringPrompt,
    'worker_hr'
  );
  const chainRes = await chain.invoke({ input: input});
  console.log('\n *** Chain Response: ', chainRes, '\n');

  return chainRes.answer;

}