import { DynamicTool } from '@langchain/core/tools';
import fetch from 'node-fetch';
import { auth } from '@/auth';

export const absenceTool = new DynamicTool({
  name: 'get_absence_info',
  description: `Returns info on absences or time offs or leaves for a given employee. \
  These would be like balances, days or hours taken so far and any other relevant information.`,
  func: async (input: string) => {
    console.log('\n \n absenceTool input', input, '\n \n');
    return await getAbsenceInfo(input);
  },
});

async function getAbsenceInfo(input: string) {
  // Fetch data from an external API
  const session = await auth();
  const employeeId = session?.user.id?.toString();
  const WD_Absence_URL = employeeId ? process.env.WD_Absence_URL + employeeId : '';

  console.log('\n WD_Absence_URL = ', WD_Absence_URL, '\n');
  const response = await fetch(WD_Absence_URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(
        `${process.env.WD_USER_ID}:${process.env.WD_PWD}`
      ).toString('base64')}`,
    },
  });

  const data = JSON.stringify(await response.json(), null, 2);
  console.log('\n Response Data = ', data, '\n');
    
  return data; 
}

async function getSampleData(input: string) {
  if (input.toLowerCase().includes('pto')) {
    return 'PTO balance is 100 hours';
  } else if (input.toLowerCase().includes('sick')) {
    return 'Sick leave balance is 40 hours';
  } else {
    return "Sorry... I don't have that information";
  }
}
