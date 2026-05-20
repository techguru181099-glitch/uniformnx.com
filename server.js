require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path"); // ✅ YE ZAROORI THA: Iske bina server crash ho jayega

/* Database Connection */
const connectDB = require("./config/db");
connectDB();

/* Routes */
const U_router = require("./routes/adminRoutes");
const router = require("./routes/schoolRoutes");
const P_router = require("./routes/parentRoutes");
const D_router = require("./routes/dashboardRoutes");
const UF_router = require("./routes/uniformRoutes");
const C_router = require("./routes/cartRoute");
const O_router = require("./routes/orderRoute");
const Crouter = require("./routes/categoryRouter");
const paymentRouter = require("./routes/paymentRoutes");

/* ================= Middleware ================= */

// Updated CORS: Ab ye Localhost aur Live dono pe chalega
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://uniformnx.com",
    "https://www.uniformnx.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Static Folder for Images
// 'path.join(__dirname, "uploads")' Windows aur Linux dono ke liye best hai
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* Routes Use */
app.use("/user", U_router);
app.use("/schools", router);
app.use("/parent", P_router);
app.use("/dashboard", D_router);
app.use("/uniform", UF_router);
app.use("/cart", C_router);
app.use("/orders", O_router);
app.use("/categories", Crouter);
app.use("/api/payment", paymentRouter);

/* Root Route */
app.get("/", (req, res) => { // ✅ Parameters fix kiye (req, res)
    res.send("🚀 School Backend Running Successfully");
});

/* Server Start */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
