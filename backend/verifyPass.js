const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'admin@sbicard.com' }).select('+password');
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }
        const isMatch = await bcrypt.compare('adminpassword123', user.password);
        console.log('Password match for adminpassword123:', isMatch);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
