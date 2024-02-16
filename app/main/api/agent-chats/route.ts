import { NextRequest, NextResponse } from 'next/server';
import { Message as VercelChatMessage, StreamingTextResponse } from 'ai';

import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, ChatMessage, HumanMessage } from '@langchain/core/messages';

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

import { absenceTool } from '../tools/absence';
import { policiesTool } from '../tools/policies';

//export const runtime = 'edge';

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === 'user') {
    return new HumanMessage(message.content);
  } else if (message.role === 'assistant') {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

const TEMPLATE = `You are HR Agent, an automated service to handle HR requests for a given organization. \
Provide final answer as sequential numbers for each summarized point. \
Answer only if you have the data provided in the context delimited by #### and is related to the question. \
Replace word KPPRA with GMS in the final response. \
Please "do not" hallucinate. Use response from any tool as part of the below context. \

Context 
####
{context}
####

Current conversation:
{chat_history}

User: {input}
AI:`;

/**
 * This handler initializes and calls an OpenAI Functions agent.
 * See the docs for more information:
 *
 * https://js.langchain.com/docs/modules/agents/agent_types/openai_functions_agent
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    /**
     * We represent intermediate steps as system messages for display purposes,
     * but don't want them in the chat history.
     */
    const messages = (body.messages ?? []).filter(
      (message: VercelChatMessage) =>
        message.role === 'user' || message.role === 'assistant',
    );
    const returnIntermediateSteps = body.show_intermediate_steps;
    const previousMessages = messages
      .slice(0, -1)
      .map(convertVercelMessageToLangChainMessage);
    const currentMessageContent = messages[messages.length - 1].content;

    const tools = [absenceTool, policiesTool];
//    const tools = [absenceTool];

    const chat = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo-1106',
      temperature: 0,
      streaming: true,
    });

    const prompt_1 = ChatPromptTemplate.fromMessages([
      ['system', TEMPLATE],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = await createOpenAIFunctionsAgent({
      llm: chat,
      tools,
      prompt: prompt_1,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      // Set this if you want to receive all intermediate steps in the output of .invoke().
      // returnIntermediateSteps,
    });
    console.log('\n \n *** BEFORE agentExecutor.invoke *** \n \n');

    const logStream = await agentExecutor.streamLog({
//      context: previousMessages,
      context: 'Information about HR policies and procedures.',
      input: currentMessageContent,
      chat_history: previousMessages,
    });

    const textEncoder = new TextEncoder();
    const transformStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of logStream) {
          if (chunk.ops?.length > 0 && chunk.ops[0].op === "add") {
            const addOp = chunk.ops[0];
            if (
              addOp.path.startsWith("/logs/ChatOpenAI") &&
              typeof addOp.value === "string" &&
              addOp.value.length
            ) {
              controller.enqueue(textEncoder.encode(addOp.value));
            }
          }
        }
        controller.close();
      },
    });

    console.log('\n \n *** AFTER agentExecutor.invoke *** \n \n');

    return new StreamingTextResponse(transformStream);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
