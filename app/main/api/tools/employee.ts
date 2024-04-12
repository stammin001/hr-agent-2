import { DynamicTool } from '@langchain/core/tools';
import fetch from 'node-fetch';
import { auth } from '@/auth';

export const employeeTool = new DynamicTool({
  name: 'get_employee_info',
  description: `Returns general HR related information of specific employee that is logged in. \
  This would be like name, address, job, company, department, etc. of the employee.
  `,
  func: async (input: string) => {
    console.log('\n \n employeeTool input', input, '\n \n');
    return await getEmployeeInfo(input);
  },
});

async function getEmployeeInfo(input: string) {
  // Fetch data from an external API
  const session = await auth();
  const employeeId = session?.user.id?.toString();
  const WD_Worker_URL = employeeId ? process.env.WD_Worker_URL + employeeId : '';

  console.log('\n WD_Worker_URL = ', WD_Worker_URL, '\n');
  const response = await fetch(WD_Worker_URL, {
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
