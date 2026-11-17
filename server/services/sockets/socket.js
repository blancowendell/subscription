let ioInstance = null;

const initSocket = (server) => {
  const { Server } = require("socket.io");

  ioInstance = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  ioInstance.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("JOIN_ROOM", ({ roomId }) => {
      const room = typeof roomId === 'object' ? roomId.roomId : roomId;
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("SEND_MESSAGE", ({ roomId, message }) => {
      console.log(`Relaying message to room ${roomId}:`, message.tc_description);
      
      ioInstance.to(roomId).emit("NEW_MESSAGE", message);
    });

    socket.on("SEND_TYPING", ({ roomId, fullname, isTyping }) => {
      socket.to(roomId).emit("RECEIVE_TYPING", {
        roomId,
        fullname,
        isTyping,
      });
    });

    socket.on("LEAVE_ROOM", ({ roomId }) => {
      const room = typeof roomId === 'object' ? roomId.roomId : roomId;
      socket.leave(room);
      console.log(`User ${socket.id} left room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized!");
  }
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO,
};