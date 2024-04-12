import { get } from 'http';
import fetch from 'node-fetch';
import { config } from 'dotenv';
config();

async function getAbsenceInfo(input: string) {
  // Fetch data from an external API
  //const URL = process.env.WD_Absence_URL;
  const URL = "https://impl-services1.wd12.myworkday.com/ccx/service/customreport2/wdmarketdesk_dpt1/xjin-impl/Worker_Absence_Data_2?format=json&employee_id=21082";
  console.log('\n WD_Absence_URL = ', URL, '\n')
  const response = await fetch(URL, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from('xjin-impl:Workday123!!'
//        `${process.env.WD_USER_ID}:${process.env.WD_PWD}`
      ).toString('base64')}`,
    },
  });
  console.log('\n Response = ', JSON.stringify(await response.json(), null, 2), '\n');
    
  return ""; // await response.json();
}

getAbsenceInfo('input');