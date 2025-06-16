const socketIo = require('socket.io');
const logger = require('../utils/logger');

const initSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Nouvelle connexion WebSocket: ${socket.id}`);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      logger.info(`Utilisateur ${socket.id} a rejoint la salle: ${room}`);
    });

    socket.on('message', ({ room, message }) => {
      io.to(room).emit('message', message);
      logger.info(`Message envoyé dans la salle ${room}: ${JSON.stringify(message)}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Déconnexion WebSocket: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initSocket;