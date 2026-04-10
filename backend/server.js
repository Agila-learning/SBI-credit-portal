const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
const User = require('./src/models/User');

const startApp = async () => {
  try {
    await connectDB();
    
    // Auto-seed Admin if not exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('No admin found, auto-seeding default admin...');
      await User.create({
        name: 'System Administrator',
        email: 'admin@sbicard.com',
        password: 'adminpassword123',
        role: 'admin',
        employeeId: 'ADMIN-001',
        phone: '9876543210',
      });
      console.log('Default admin created: admin@sbicard.com / adminpassword123');
    }

    const { setupDailyLeaderboardSnapshot } = require('./src/utils/scheduler');
    setupDailyLeaderboardSnapshot();
  } catch (err) {
    console.error('Failed to start application sequence:', err);
  }
};

startApp();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: false, // For local image viewing
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static folder for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadDir)) {
  require('fs').mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// File Upload Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/leads', require('./src/routes/leadRoutes'));
app.use('/api/stats', require('./src/routes/statsRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/chat', require('./src/routes/chatRoutes'));
app.use('/api/incentives', require('./src/routes/incentiveRoutes'));
app.use('/api/slabs', require('./src/routes/incentiveSlabRoutes'));
app.use('/api/employees', require('./src/routes/employeeRoutes'));
app.use('/api/tasks', require('./src/routes/taskRoutes'));
app.use('/api/announcements', require('./src/routes/announcementRoutes'));

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

// Admin logic moved to employeeRoutes

// Socket.io Real-time Logic
const socketUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  // User joins with their userId
  socket.on('join', async (userId) => {
    socketUsers.set(userId, socket.id);
    io.emit('userStatus', { userId, status: 'online' });

    // Update lastSeen in DB
    try {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    } catch (_) {}
  });

  // Direct message relay
  socket.on('sendMessage', (data) => {
    const recipientSocketId = socketUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receiveMessage', data);
    }
  });

  // Typing indicators
  socket.on('typing', ({ recipientId, senderName }) => {
    const recipientSocketId = socketUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { senderName });
    }
  });

  socket.on('stopTyping', ({ recipientId }) => {
    const recipientSocketId = socketUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('stopTyping', {});
    }
  });

  // Read receipt
  socket.on('messageRead', ({ senderId, conversationUserId }) => {
    const senderSocketId = socketUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messageRead', { conversationUserId });
    }
  });

  // Message deletion relay
  socket.on('deleteMessage', ({ messageId, recipientId }) => {
    const recipientSocketId = socketUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('messageDeleted', { messageId });
    }
  });

  // Admin broadcast relay to all active employees
  socket.on('broadcastMessage', (data) => {
    for (const [uid, sid] of socketUsers.entries()) {
      if (uid !== data.senderId) {
        io.to(sid).emit('receiveMessage', data);
      }
    }
  });

  socket.on('disconnect', async () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of socketUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        socketUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      io.emit('userStatus', { userId: disconnectedUserId, status: 'offline' });
      try {
        await User.findByIdAndUpdate(disconnectedUserId, { lastSeen: new Date() });
      } catch (_) {}
    }
  });
});

const PORT = process.env.PORT || 5050;

server.listen(
  PORT,
  () => console.log(`Server running on port ${PORT}`)
);
