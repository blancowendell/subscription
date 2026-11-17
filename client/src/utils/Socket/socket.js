// src/utils/socket.js
import { io } from "socket.io-client";

// Use 5020 to match your main backend
const SIGNALING_URL = import.meta.env.VITE_DEVELOPMENT_API || "http://localhost:5020";

const socket = io(SIGNALING_URL, {
  path: "/socket.io", 
  transports: ["websocket", "polling"],
  withCredentials: true
});

export default socket;