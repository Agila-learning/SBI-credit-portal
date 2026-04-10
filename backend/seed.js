const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config({ path: require('path').join(__dirname, '.env') });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit();
    }

    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@sbicard.com',
      password: 'adminpassword123',
      role: 'admin',
      employeeId: 'ADMIN-001',
      phone: '9876543210',
    });

    console.log('Admin user created successfully');
    console.log('Email: admin@sbicard.com');
    console.log('Password: adminpassword123');
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
