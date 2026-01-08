const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Join room
    socket.on('joinRoom', () => {
        let roomId = null;

        // Find available room or create new one
        for (let id in rooms) {
            if (rooms[id].players.length < 2) {
                roomId = id;
                break;
            }
        }

        if (!roomId) {
            roomId = 'room_' + Date.now();
            rooms[roomId] = { players: [] };
        }

        // Add player to room
        socket.join(roomId);
        socket.roomId = roomId;
        
        const playerNumber = rooms[roomId].players.length + 1;
        socket.playerNumber = playerNumber;
        
        rooms[roomId].players.push({
            id: socket.id,
            playerNumber: playerNumber
        });

        console.log(`Player ${socket.id} joined ${roomId} as Player ${playerNumber}`);

        // Send player their number
        socket.emit('playerNumber', playerNumber);

        // If room is full, start game
        if (rooms[roomId].players.length === 2) {
            io.to(roomId).emit('startGame');
            console.log(`Game started in ${roomId}`);
        }
    });

    // Relay player data
    socket.on('playerUpdate', (data) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponentUpdate', data);
        }
    });

    // Relay bullets
    socket.on('bulletFired', (data) => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponentBullet', data);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (socket.roomId && rooms[socket.roomId]) {
            rooms[socket.roomId].players = rooms[socket.roomId].players.filter(
                p => p.id !== socket.id
            );
            
            // Notify other player
            socket.to(socket.roomId).emit('opponentLeft');
            
            // Delete empty rooms
            if (rooms[socket.roomId].players.length === 0) {
                delete rooms[socket.roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
