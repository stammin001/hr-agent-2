import * as fs from "fs";
import * as yaml from "js-yaml";

import { DynamicTool } from '@langchain/core/tools';
import { JsonObject, JsonSpec } from 'langchain/tools';

export const openaiapiTool = new DynamicTool({
  name: 'openai_api_tool',
  description: `Returns info on openAI API functions and parameters needed to make API calls.`,
  func: async (input: string) => {
    console.log('\n \n openaiapiTool input = ', input, '\n \n');
    const api_spec = getAPI_Spec();
    const spec = new JsonSpec(api_spec);
    console.log('openaiapiTool spec = ', spec, '\n \n')
    return JSON.stringify(spec);
  },
});

function getAPI_Spec(): JsonObject {
  let data: JsonObject;
  try {
    const yamlFile = fs.readFileSync("app/data/openai_openapi.yaml", "utf8");
    data = yaml.load(yamlFile) as JsonObject;
    if (!data) {
      throw new Error("Failed to load OpenAPI spec");
    }
  } catch (e) {
    console.error(e);
    return {};
  }
  return data;
}