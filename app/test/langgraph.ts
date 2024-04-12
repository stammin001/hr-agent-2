import {
  AgentExecutor,
  createOpenAIFunctionsAgent,
  AgentAction,
} from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';
import {
  BaseMessage,
  AIMessage,
  ChatMessage,
  HumanMessage,
  FunctionMessage,
} from '@langchain/core/messages';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import * as hub from 'langchain/hub';
import { StateGraph, END } from '@langchain/langgraph';
import { RunnableLambda } from '@langchain/core/runnables';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

import { absenceTool } from '../main/api/tools/absence';
import { policiesTool, policiesTool_2 } from '../main/api/tools/policies';
import { HRPublicTool } from '../main/api/tools/hr_public';
import { employeeTool } from '../main/api/tools/employee';

import { ToolExecutor } from '@langchain/langgraph/prebuilt';
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '..', '..', '.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('Error loading .env file');
  throw result.error;
}

interface Employee {
  id: number;
  name?: string;
  position?: string;
}

export async function buildLangGraph() {
  //  const tools = [absenceTool, policiesTool, employeeTool, HRPublicTool];
  const tools = [new TavilySearchResults({ maxResults: 1 }), policiesTool_2];

  const toolExecutor = new ToolExecutor({
    tools,
  });

  const toolsAsOpenAIFunctions = tools.map((tool) =>
    convertToOpenAIFunction(tool),
  );

  const model = new ChatOpenAI({
    modelName: process.env.GLOBAL_MODEL_NAME,
//    modelName: 'gpt-4',
    temperature: 0,
    streaming: true,
  });

  const newModel = model.bind({
    functions: toolsAsOpenAIFunctions,
  });

  const agentState = {
    employee: {
      value: null as Employee | null,
    },
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
  };

  const { callModel, callModel_2, callTool, shouldContinue } = await defineNodes(
    model,
    toolExecutor,
    newModel
  );

  return defineGraph(agentState, callModel, callModel_2, callTool, shouldContinue);
}

export async function defineNodes(model: any, toolExecutor: any, newModel: any) {
  // Define the function that determines whether to continue or not
  const shouldContinue = (state: { messages: Array<BaseMessage> }) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    // If there is no function call, then we finish
    if (
      !('function_call' in lastMessage.additional_kwargs) ||
      !lastMessage.additional_kwargs.function_call
    ) {
      return 'end';
    }
    // Otherwise if there is, we continue
    return 'continue';
  };

  // Define the function to execute tools
  const _getAction = (state: { messages: Array<BaseMessage> }): AgentAction => {
    const { messages } = state;
    // Based on the continue condition
    // we know the last message involves a function call
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      throw new Error('No messages found.');
    }
    if (!lastMessage.additional_kwargs.function_call) {
      throw new Error('No function call found in message.');
    }
    console.log('Last Message: \n', lastMessage);
    // We construct an AgentAction from the function_call
    return {
      tool: lastMessage.additional_kwargs.function_call.name,
      toolInput: lastMessage.additional_kwargs.function_call.arguments,
      log: '',
    };
  };

  // Define the function that calls the model
  const callModel = async (state: {
    employee: Employee | null;
    messages: Array<BaseMessage>;
  }) => {
    const { employee, messages } = state;
    console.log(
      'Messages in callModel with EE ID:',
      employee?.id,
      '\n',
      messages,
    );
    const response = await newModel.invoke(messages);
    console.log('Response in callModel: \n', response);
    // We return a list, because this will get added to the existing list
    return {
      messages: [response],
    };
  };

  // Define the function that calls the model
  const callModel_2 = async (state: {
    employee: Employee | null;
    messages: Array<BaseMessage>;
  }) => {
    const { employee, messages } = state;
    console.log(
      'Messages in callModel_2 with EE ID:',
      employee?.id,
      '\n',
      messages,
    );
    const response = await model.invoke(messages);
    console.log('Response in callModel_2: \n', response);
    // We return a list, because this will get added to the existing list
    return {
      messages: [response],
    };
  };

  const callTool = async (state: { messages: Array<BaseMessage> }) => {
    const action = _getAction(state);
    // We call the tool_executor and get back a response
    console.log('Action of Tool Executor:', action);

    // Parse the toolInput string as JSON
    let toolInput = JSON.parse(action.toolInput);
    toolInput.ID = 789;
    action.toolInput = JSON.stringify(toolInput);

    const response = await toolExecutor.invoke(action);
    // We use the response to create a FunctionMessage
    const functionMessage = new FunctionMessage({
      content: response,
      name: action.tool,
    });
    // We return a list, because this will get added to the existing list
    return { messages: [functionMessage] };
  };

  return { callModel, callModel_2, callTool, shouldContinue };
}

export async function defineGraph(
  agentState: any,
  callModel: any,
  callModel_2: any,
  callTool: any,
  shouldContinue: any,
) {
  // Define a new graph
  const workflow = new StateGraph({
    channels: agentState,
  });

  // Define the two nodes we will cycle between
  workflow.addNode('agent', new RunnableLambda({ func: callModel }));
  workflow.addNode('action', new RunnableLambda({ func: callTool }));

  workflow.addNode('agent_2', new RunnableLambda({ func: callModel_2 }));

  // Set the entrypoint as `agent`
  // This means that this node is the first one called
  workflow.setEntryPoint('agent');

  // We now add a conditional edge
  workflow.addConditionalEdges(
    // First, we define the start node. We use `agent`.
    // This means these are the edges taken after the `agent` node is called.
    'agent',
    // Next, we pass in the function that will determine which node is called next.
    shouldContinue,
    // Finally we pass in a mapping.
    // The keys are strings, and the values are other nodes.
    // END is a special node marking that the graph should finish.
    // What will happen is we will call `should_continue`, and then the output of that
    // will be matched against the keys in this mapping.
    // Based on which one it matches, that node will then be called.
    {
      // If `tools`, then we call the tool node.
      continue: 'action',
      // Otherwise we finish.
      end: END,
    },
  );

  // We now add a normal edge from `tools` to `agent`.
  // This means that after `tools` is called, `agent` node is called next.
  workflow.addEdge('action', 'agent_2');

  // We now add a conditional edge for `agent_2`
  workflow.addConditionalEdges(
    'agent_2',
    shouldContinue,
    {
      continue: 'action',
      end: END,
    },
  );

  // km2987@firstday.foundation : Lee Cage 

  // Finally, we compile it!
  // This compiles it into a LangChain Runnable,
  // meaning you can use it as you would any other runnable
  const app = workflow.compile();

  return app;
}

export async function testLangGraph() {
  const inputs = {
    employee: {
      id: 123,
    },
//    messages: [new HumanMessage('what are available leave options as per the policy')],
    messages: [new HumanMessage('what are leave options')],
    //    messages: [
    //      new HumanMessage('my name is John'),
    //      new HumanMessage('what is my name'),
    //    ],
    //    messages: [new HumanMessage('what is the weather in sf')],
    //    messages: [new HumanMessage('how did NVidia stock perform on the day of March 8th 2024')]
  };
  const app = await buildLangGraph();
  const result = await app.invoke(inputs);
  console.log('Result=', result);
}

testLangGraph();
