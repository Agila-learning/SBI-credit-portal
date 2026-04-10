const mongoose = require('mongoose');
const User = require('./src/models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const reset = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'admin@sbicard.com' });
        if (user) {
            user.password = 'adminpassword123';
            await user.save();
            console.log('Admin password explicitly reset and hashed');
        } else {
            console.log('Admin not found, seeding...');
            await User.create({
                name: 'System Administrator',
                email: 'admin@sbicard.com',
                password: 'adminpassword123',
                role: 'admin',
                employeeId: 'ADMIN-001',
                phone: '9876543210',
            });
            console.log('Admin created');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

reset();
