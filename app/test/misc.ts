let obj = {
    tool: 'Policies',
    toolInput: '"{\\"input\\":\\"leave policies\\"}"',
    log: ''
  };
  
  console.log('Before: \n', obj);

  // Parse the toolInput string as JSON
  let toolInput = JSON.parse(JSON.parse(obj.toolInput));
  
  // Add the ID property
  toolInput.ID = 'some id';
  
  // Stringify the toolInput object and assign it back to obj.toolInput
  obj.toolInput = JSON.stringify(JSON.stringify(toolInput));
  
  console.log('After: \n', obj);