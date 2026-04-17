const mongoose = require('mongoose');
const User = require('./src/models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}).lean();
        console.log('Total users:', users.length);
        users.forEach(u => {
            console.log(`- ID: ${u._id} Name: ${u.name} (${u.email}) role: ${u.role} isDeleted: ${u.isDeleted} platform: ${u.platform || 'N/A'}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
