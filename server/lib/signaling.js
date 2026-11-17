const { Server: IOServer } = require("socket.io");
const jwt = require("jsonwebtoken");

function initSignalingServer(httpServer, opts = {}) {
  if (!httpServer) throw new Error("httpServer is required to init signaling server.");

  const {
    path = "/socket.io",
    corsOrigins = "*",
    maxRoomSize = 2,
    enableAuth = false,
    jwtSecret = process.env.JWT_SECRET || null,
  } = opts;

  if (enableAuth && !jwtSecret) {
    throw new Error("enableAuth=true requires jwtSecret option or process.env.JWT_SECRET");
  }

  const io = new IOServer(httpServer, {
    path,
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // INITIALIZATION LOGS
  console.log("===========================================");
  console.log("📡 WebRTC Signaling Server Initialized");
  console.log("➡️  Path:", path);
  console.log("➡️  Allowed CORS origins:", corsOrigins);
  console.log("➡️  Max room size:", maxRoomSize);
  console.log("➡️  Auth enabled:", enableAuth);
  console.log("===========================================");

  // OPTIONAL AUTH
  if (enableAuth) {
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (!token) {
          console.log(`❌ [AUTH FAIL] Missing token for socket ${socket.id}`);
          return next(new Error("Authentication error: token missing"));
        }
        jwt.verify(token, jwtSecret, (err, payload) => {
          if (err) {
            console.log(`❌ [AUTH FAIL] Invalid token for socket ${socket.id}`);
            return next(new Error("Authentication error: invalid token"));
          }
          socket.user = payload;
          console.log(`🔐 [AUTH OK] Socket ${socket.id} authenticated`);
          next();
        });
      } catch (err) {
        next(new Error("Authentication error"));
      }
    });
  }

  io.on("connection", (socket) => {
    console.log(`🔌 [CONNECT] ${socket.id} connected (IP: ${socket.handshake.address})`);

    socket.on("join", (roomId) => {
      try {
        console.log(`📥 [JOIN] ${socket.id} requests to join room: ${roomId}`);

        if (!roomId) {
          console.log(`❌ [JOIN FAIL] No roomId from ${socket.id}`);
          socket.emit("error", { message: "roomId required" });
          return;
        }

        const room = io.sockets.adapter.rooms.get(roomId) || new Set();
        const numClients = room.size;

        console.log(`   Clients currently in room ${roomId}: ${numClients}`);

        if (numClients >= maxRoomSize) {
          console.log(`❌ [ROOM FULL] Room ${roomId} full`);
          socket.emit("room-full", { roomId });
          return;
        }

        socket.join(roomId);

        const isInitiator = numClients === 0;
        console.log(`   ➡️ ${socket.id} joined room ${roomId}`);
        console.log(`   ➡️ isInitiator: ${isInitiator}`);

        socket.emit("joined", { roomId, isInitiator });
        socket.to(roomId).emit("peer-joined", { socketId: socket.id, user: socket.user || null });

        console.log(`   👥 Room ${roomId} now has ${numClients + 1} clients`);
      } catch (err) {
        console.error("Error in join:", err);
        socket.emit("error", { message: "join failed" });
      }
    });

    socket.on("signal", ({ roomId, data }) => {
      try {
        const type = data?.type || (data?.candidate ? "candidate" : "unknown");
        console.log(`📡 [SIGNAL] ${socket.id} → room ${roomId} (type: ${type})`);

        socket.to(roomId).emit("signal", { from: socket.id, data });
      } catch (err) {
        console.error("Error emitting signal:", err);
      }
    });

    socket.on("leave", (roomId) => {
      console.log(`🚪 [LEAVE] ${socket.id} leaving room: ${roomId}`);
      try {
        socket.leave(roomId);
        socket.to(roomId).emit("peer-left", { socketId: socket.id });
      } catch (err) {
        console.error("Error in leave:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ [DISCONNECT] ${socket.id}`);
      console.log(`   Reason: ${reason}`);
      try {
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        rooms.forEach((roomId) => {
          console.log(`   ➡️ Notifying room ${roomId} of disconnect`);
          socket.to(roomId).emit("peer-left", { socketId: socket.id });
        });
      } catch (err) {
        console.error("Error notifying rooms on disconnect:", err);
      }
    });
  });

  return io;
}

module.exports = { initSignalingServer };
