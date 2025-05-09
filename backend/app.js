const express = require('express');
const dotenv = require('dotenv');
const router = require('./route');
const { createServer } = require("http");
const socketIO = require("socket.io");
const cors = require('cors');
const { socketConnection } = require('./socket-connect');
const { startLocal } = require('./tool');

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const app = express();
app.use(cors());

const httpServer = createServer(app);
socketConnection(httpServer);

httpServer.listen(PORT, () => {
  console.log("Server started");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const msg = err.message || 'Oops! something went wrong. Please try again';
  res.status(statusCode).send(msg);
};

app.use('/api/v1', router);

app.get('/startLocal', startLocal);

app.use(globalErrorHandler);

module.exports = app;
