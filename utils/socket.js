const User = require('../models/User');
const registerGameSocket = require('./gameSocket');
const registerTradeSocket = require('./tradeSocket');
const registerWorldEvents = require('./worldEvents');

module.exports = (io) => {
  const onlineUsers = new Map();
  const gameSocketHandler = registerGameSocket(io);
  const tradeSocketHandler = registerTradeSocket(io);
  const worldEventsHandler = registerWorldEvents(io);

  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user_${userId}`);
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit('user_online', { userId });
    }

    gameSocketHandler(socket);
    tradeSocketHandler(socket);
    worldEventsHandler(socket);

    // Typing indicators
    socket.on('typing', ({ conversationId, userId }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', { userId });
    });
    socket.on('stop_typing', ({ conversationId, userId }) => {
      socket.to(`conv_${conversationId}`).emit('user_stop_typing', { userId });
    });

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    // Real-time message
    socket.on('send_message', (data) => {
      io.to(`conv_${data.conversationId}`).emit('new_message', data);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (userId) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        io.emit('user_offline', { userId });
      }
    });
  });
};
