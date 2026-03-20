const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const eventsRouter = require('./routes/events');


const app = express();
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
})); // your frontend origin
app.use(express.json());

app.use('/api/events', eventsRouter);

app.listen(3000, () => console.log('Server running on port 3000'));