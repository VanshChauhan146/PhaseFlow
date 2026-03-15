const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

let latestData = {};
let history = [];

app.post('/api/data', (req, res) => {
  latestData = {
    ...req.body,
    receivedAt: new Date().toISOString()
  };
  history.push(latestData);
  if (history.length > 100) history.shift();
  console.log('Data received at:', new Date().toLocaleTimeString(), latestData);
  res.json({ status: 'ok' });
});

app.get('/api/live', (req, res) => {
  res.json(latestData);
});

app.get('/api/history', (req, res) => {
  res.json(history);
});

app.get('/', (req, res) => {
  res.send('SmartGrid Server is running!');
});

app.listen(3000, '0.0.0.0', () => {
  console.log('=======================================');
  console.log(' PhaseFlow — Backend Server');
  console.log(' Running on http://0.0.0.0:3000');
  console.log('=======================================');
});