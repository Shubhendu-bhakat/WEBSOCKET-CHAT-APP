"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
// Store socket with room and user info
const allSocket = new Map();
wss.on("connection", (socket) => {
    console.log("New client connected");
    socket.on("message", (message) => {
        try {
            const parseMessage = JSON.parse(message.toString());
            if (parseMessage.type === "join") {
                // Store both roomId and user data
                allSocket.set(socket, {
                    roomId: parseMessage.payLoad.roomId,
                    user: parseMessage.payLoad.user
                });
                console.log(`User ${parseMessage.payLoad.user.name} joined room ${parseMessage.payLoad.roomId}`);
                // Optionally notify other users in the room
                const currentRoom = parseMessage.payLoad.roomId;
                allSocket.forEach((socketData, clientSocket) => {
                    if (socketData.roomId === currentRoom && clientSocket !== socket) {
                        clientSocket.send(JSON.stringify({
                            type: "user_joined",
                            user: parseMessage.payLoad.user
                        }));
                    }
                });
            }
            if (parseMessage.type === "chat") {
                const socketData = allSocket.get(socket);
                if (!socketData) {
                    socket.send(JSON.stringify({
                        type: "error",
                        message: "You must join the room to send the message."
                    }));
                    return;
                }
                const currentRoom = socketData.roomId;
                const senderUser = socketData.user;
                // Broadcast to all users in the same room
                allSocket.forEach((roomData, clientSocket) => {
                    if (roomData.roomId === currentRoom) {
                        clientSocket.send(JSON.stringify({
                            type: "chat",
                            user: senderUser,
                            message: parseMessage.payLoad.message,
                            timestamp: parseMessage.payLoad.timestamp || new Date().toISOString()
                        }));
                    }
                });
            }
        }
        catch (error) {
            console.error("Error parsing message:", error);
            socket.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
            }));
        }
    });
    socket.on("close", () => {
        const socketData = allSocket.get(socket);
        if (socketData) {
            console.log(`User ${socketData.user.name} disconnected`);
            // Notify other users in the room
            const currentRoom = socketData.roomId;
            allSocket.forEach((roomData, clientSocket) => {
                if (roomData.roomId === currentRoom && clientSocket !== socket) {
                    clientSocket.send(JSON.stringify({
                        type: "user_left",
                        userId: socketData.user.id,
                        userName: socketData.user.name
                    }));
                }
            });
        }
        allSocket.delete(socket);
        console.log("Client disconnected and removed from map.");
    });
});
console.log("WebSocket server running on ws://localhost:8080");
