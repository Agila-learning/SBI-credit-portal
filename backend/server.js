const path = require('path');
const dotenv = require('dotenv');

// Load env vars immediately
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key_12345') {
  console.warn('WARNING: JWT_SECRET is missing or using a default placeholder. This is insecure and may lead to authentication issues.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

// Connect to database
const User = require('./src/models/User');

const startApp = async () => {
    try {
      await connectDB();
      
      // Migration: Tag legacy documents with 'sbi_portal' platform if not already tagged
      try {
        await User.updateMany({ platform: { $exists: false } }, { platform: 'sbi_portal' });
        console.log('Platform migration completed: Legacy nodes initialized to sbi_portal.');
      } catch (migErr) {
        console.error('Migration Warning:', migErr.message);
      }
      
      // Robust Auto-seed for Admin
      const adminEmail = 'admin@sbicard.com';
      const adminId = 'ADMIN-001';
      let admin = await User.findOne({ 
        $or: [{ email: adminEmail }, { employeeId: adminId }],
        platform: 'sbi_portal'
      }).select('+password');
      
      if (!admin) {
        console.log('No admin found, creating default admin...');
        await User.create({
          name: 'System Administrator',
          email: adminEmail,
          password: 'adminpassword123',
          role: 'admin',
          employeeId: adminId,
          phone: '9876543210',
          platform: 'sbi_portal'
        });
        console.log('Default admin created successfully.');
      } else {
        console.log('Admin user found, verifying...');
        admin.role = 'admin';
        if (admin.email !== adminEmail) admin.email = adminEmail;
        await admin.save();
      }
  
      // Robust Auto-seed for Employee
      const empEmail = 'employee@sbicard.com';
      const empId = 'EMP-001';
      let employee = await User.findOne({ 
        $or: [{ email: empEmail }, { employeeId: empId }],
        platform: 'sbi_portal'
      }).select('+password');
      if (!employee) {
        console.log('No sample employee found, creating...');
        await User.create({
          name: 'Sample Employee',
          email: empEmail,
          password: 'adminpassword123',
          role: 'employee',
          employeeId: empId,
          phone: '1234567890',
          platform: 'sbi_portal'
        });
        console.log('Sample employee created.');
      } else {
        console.log('Sample employee found, verifying...');
        employee.role = 'employee';
        if (employee.email !== empEmail) employee.email = empEmail;
        await employee.save();
      }
      
      // Robust Auto-seed for Team Leader
      const tlEmail = 'leader@sbicard.com';
      const tlId = 'TL-001';
      let teamLeader = await User.findOne({ 
        $or: [{ email: tlEmail }, { employeeId: tlId }],
        platform: 'sbi_portal'
      }).select('+password');
      if (!teamLeader) {
        console.log('No sample team leader found, creating...');
        await User.create({
          name: 'Senior Team Leader',
          email: tlEmail,
          password: 'adminpassword123',
          role: 'team_leader',
          employeeId: tlId,
          phone: '1231231234',
          platform: 'sbi_portal'
        });
        console.log('Sample team leader created.');
      } else {
        console.log('Sample team leader found, verifying...');
        teamLeader.role = 'team_leader';
        if (teamLeader.email !== tlEmail) teamLeader.email = tlEmail;
        await teamLeader.save();
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
app.use((req, res, next) => {
  req.io = io;
  next();
});
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

  // Generic notification relay
  socket.on('sendNotification', (data) => {
    // data: { targets: [userId], title, message, ... }
    if (data.isBroadcast) {
      socket.broadcast.emit('notification', data);
    } else if (data.targets) {
      data.targets.forEach(targetId => {
        const targetSocketId = socketUsers.get(targetId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('notification', data);
        }
      });
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
