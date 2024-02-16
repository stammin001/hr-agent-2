import { DynamicTool, Tool } from '@langchain/core/tools';

export const absenceTool = new DynamicTool({
  name: 'get_absence_info',
  description: 'Returns info on Absences like PTO balances.',
  func: async (input: string) => {
    console.log('\n \n absenceTool input', input, '\n \n');
    if (input.toLowerCase().includes('pto')) {
      return 'PTO balance is 100 hours';
    } else if (input.toLowerCase().includes('sick')) {
      return 'Sick leave balance is 40 hours';
    } else {
      return "Sorry... I don't have that information";
    }
  },
});
