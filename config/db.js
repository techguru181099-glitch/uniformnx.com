const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        console.log("✅ Database Connected");
    } catch (error) {
        console.log("❌ Database Connection Failed:", error);
        process.exit(1);
    }
};

module.exports = connectDB;