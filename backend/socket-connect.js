const socketIO = require("socket.io");

let io;

socketConnection = (httpServer) => {
    io = socketIO(httpServer, {
        cors: {
          origin: "http://localhost:5173",
          methods: ["GET", "POST"]
        },
        transports: ["websocket", "polling"],
      });

    io.on('connection', (socket) => {
        console.log(`⚡: ${socket.id} user just connected`);
        io.on('disconnect', (socket) => {
            console.log(`⚡: ${socket.id} user just disconnected`);
        });
    });
};

sendMessage = (event, data) => {
    io.emit(event, data);
};

module.exports = { socketConnection, sendMessage };