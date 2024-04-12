import { NextRequest, NextResponse } from 'next/server';
import { Message as VercelChatMessage, StreamingTextResponse } from 'ai';

import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, ChatMessage, HumanMessage } from '@langchain/core/messages';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import * as hub from 'langchain/hub';

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

import { absenceTool } from '../tools/absence';
import { policiesTool } from '../tools/policies';
import { HRPublicTool } from '../tools/hr_public';
import { employeeTool } from '../tools/employee';
import { openaiapiTool } from '../tools/openai_api';
import { auth } from '@/auth';

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
Do not answer any questions that are not related to the organization or employee or employees. \
Generate detailed descriptive output text for calls related to functions and tools.
Answer only if you have the data provided in the context or current conversation or chat history delimited by ####. \
Provide final answer as sequential numbers for each summarized point. \
For each answer, if page number or source is available, provide page number or source in brackets. \
Please "do not" hallucinate. Use answer from any tool as part of the below context. \

Context 
####
{context}
####

Current conversation:
####
{chat_history}
####

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
    const session = await auth();
    const employeeId = session?.user.id?.toString();

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
    const contextMessage =
      `Information about HR policies, procedures and employee data for HR, Absences, \      
      Time Offs, Leave, Compensation and others.`.concat(employeeId? ` If the question is related to \ 
      employee's own data, consider the Employee_ID that is part of ${employeeId} to answer the question. \
      If question is related to some other employee, consider HR Public Data to answer.`
          : '',
      );

    const hubPrompt = await hub.pull<ChatPromptTemplate>('hragent-1/mainagent-1');
    const updatedContextMessage = contextMessage.concat('  test');
    const tavilyTool = new TavilySearchResults({ maxResults: 1 });

    const tools = [tavilyTool, absenceTool, policiesTool, employeeTool, HRPublicTool, openaiapiTool];

    const chat = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo-1106',
      temperature: 0,
      streaming: true,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', TEMPLATE],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = await createOpenAIFunctionsAgent({
      llm: chat,
      tools,
      prompt: hubPrompt,
//      prompt: prompt,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      // Set this if you want to receive all intermediate steps in the output of .invoke().
      // returnIntermediateSteps,
    }).withConfig({
      tags: ['test-tag'],
      metadata: { 'test-key': 'test-value' },
    });
    console.log('\n \n *** BEFORE agentExecutor.invoke *** \n \n');

    const logStream = await agentExecutor.streamLog({
      // context: previousMessages,
      context: updatedContextMessage,
      input: currentMessageContent,
      chat_history: previousMessages,
    });

    const textEncoder = new TextEncoder();
    const transformStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of logStream) {
          if (chunk.ops?.length > 0 && chunk.ops[0].op === 'add') {
            const addOp = chunk.ops[0];
            if (
              addOp.path.startsWith('/logs/ChatOpenAI') &&
              typeof addOp.value === 'string' &&
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
