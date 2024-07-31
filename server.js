const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const bannedUsers = {};
const usernames = {};
const votes = {};

io.on('connection', (socket) => {
    console.log('Novo usuário conectado');

    socket.on('join-room', (room) => {
        socket.join(room);
        if (!rooms[room]) {
            rooms[room] = { messages: [] };
        }
        socket.room = room;
        io.to(room).emit('history', rooms[room].messages);
    });

    socket.on('message', (msg) => {
        const room = socket.room;
        const message = { user: usernames[socket.id] || 'Anônimo', text: msg };
        rooms[room].messages.push(message);
        io.to(room).emit('message', message);
    });

    socket.on('set-username', (username) => {
        usernames[socket.id] = username;
    });

    socket.on('private-message', ({ recipientId, msg }) => {
        io.to(recipientId).emit('private-message', { user: usernames[socket.id] || 'Anônimo', text: msg });
    });

    socket.on('ban-user', (userId) => {
        bannedUsers[userId] = true;
        io.to(userId).emit('banned');
    });

    socket.on('feedback', (feedback) => {
        console.log(`Feedback recebido: ${feedback}`);
    });

    socket.on('file', (file) => {
        io.emit('file', file);
    });

    socket.on('vote', ({ messageId, vote }) => {
        votes[messageId] = votes[messageId] || { upvotes: 0, downvotes: 0 };
        if (vote === 'upvote') {
            votes[messageId].upvotes += 1;
        } else {
            votes[messageId].downvotes += 1;
        }
        io.emit('update-votes', { messageId, votes: votes[messageId] });
    });

    socket.on('request-history', () => {
        const room = socket.room;
        socket.emit('history', rooms[room].messages);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
