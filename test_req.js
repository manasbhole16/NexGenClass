const http = require('http');

const data = JSON.stringify({
  roomId: '6a02fa1b7b55c7c0f4767aca', // using the room ID from the log
  date: '2023-10-25',
  records: [{
      student: '6a02f9fc7b55c7c0f4767abf',
      status: 'Present',
      remarks: ''
  }]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/attendance',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IlhZWjEyM0BHTUFJTC5DT00iLCJpZCI6IjZhMDJmOWZjN2I1NWM3YzBmNDc2N2FiZiIsImlhdCI6MTc3ODU4MTUzOCwiZXhwIjoxNzc4NjY3OTM4fQ.33_VB-me-9HjuDnV-uX4JDwQMDbue3DpC7Slj3vvN9E'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
