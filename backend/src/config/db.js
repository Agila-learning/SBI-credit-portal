const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI;
    const dbName = 'fic_sbi_portal';
    
    if (!rawUri) {
      console.error('ERROR: MONGODB_URI is not defined.');
      process.exit(1);
    }

    let finalUri = rawUri;
    if (!rawUri.includes(`/${dbName}`)) {
        if (rawUri.includes('?')) {
            const [base, params] = rawUri.split('?');
            finalUri = `${base.endsWith('/') ? base : base + '/'}${dbName}?${params}`;
        } else {
            finalUri = `${rawUri.endsWith('/') ? rawUri : rawUri + '/'}${dbName}`;
        }
    }

    const conn = await mongoose.connect(finalUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
