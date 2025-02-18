import express from "express";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const calls = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("startCall", () => {
        const callId = uuidv4();
        calls[callId] = socket.id;
        socket.join(callId);
        socket.emit("callStarted", { callId });
    });

    socket.on("joinCall", (callId) => {
        if (calls[callId]) {
            socket.join(callId);
            io.to(callId).emit("userJoined", { socketId: socket.id });
        } else {
            socket.emit("error", { message: "Invalid Call ID" });
        }
    });

    socket.on("message", ({ callId, message }) => {
        io.to(callId).emit("message", message);
    });

    socket.on("endCall", (callId) => {
        io.to(callId).emit("callEnded");
        delete calls[callId];
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
