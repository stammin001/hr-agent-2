import { DynamicStructuredTool, DynamicTool, DynamicToolInput } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { getRetrievalChain, getRelevantData } from '../../lib/redis_vectorstore';

import { z } from "zod";

export const policiesTool = new DynamicTool({
  name: 'Policies',
  description: `Initializes with all HR related policies and procedures for employees in GMS.`,
  func: async (input) => {
    console.log('\n *** policiesTool input:', input, '\n');

    if(input === undefined || input === null || input === '' || input === '"{}"') {
      return 'Sorry... Please provide information to search for';
    }

    try {

      const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `Do not make up answers. For each answer, provide page number or source in brackets. \
           Do not repeat the same source information in the same line. \
           In the response, replace word KPPRA with GMS. \
           Answer the user's questions in sequential numbers based on the below context:\n\n {context} \
           For each answer, provide source in brackets.`,
        ],
        ['human', '{input}'],
      ]);

      const chain = await getRetrievalChain(
        questionAnsweringPrompt,
        'hr_policies',
      );

      const chainRes = await chain.invoke({ input: input });

      console.log('\n *** Chain Response: \n', chainRes);

      return chainRes.answer;
    } catch (error) {
      console.log('\n *** policiesTool error:', error, '\n');
      return "Sorry... I don't have that information";
    }
  },
});

export const policiesTool_2 = new DynamicTool({
  name: 'Policies',
  description: `Initializes with all HR related policies and procedures for employees in GMS.`,
  func: async (input) => {
    console.log('\n *** policiesTool_2 input:', input, '\n');

    if(input === undefined || input === null || input === '' || input === '"{}"') {
      return 'Sorry... Please provide information to search for';
    }

    let id;

    if(isJSON(input)) {
      const inputObject = JSON.parse(input);
      input = inputObject.input;
      id = inputObject.ID;
    }
    
    console.log("Input: ", input, "ID: ", id, "\n");

    try {

      const data = await getRelevantData(input, 'hr_policies');

      console.log('\n *** VectorStore Data: \n', data);

      return data;
    } catch (error) {
      console.log('\n *** policiesTool_2 error:', error, '\n');
      return "Sorry... Error in retrieving data";
    }
  },
});

function isJSON(input: string) {
  try {
      JSON.parse(input);
  } catch (e) {
      return false;
  }
  return true;
}
