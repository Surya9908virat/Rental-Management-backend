import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/database.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
import landlordRoutes from "./routes/landlord.routes.js";
import tenantRoutes from "./routes/tenant.routes.js";
import PropertyRouter from "./routes/property.routes.js";
import leaseRouter from "./routes/lease.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import maintenanceRouter from "./routes/maintenance.routes.js";
import messageRoutes from "./routes/message.routes.js";

const app = express();

// ✅ FIX 1: CORS (IMPORTANT for deployment)
app.use(
  cors({
    origin: "*", // allow all (or replace with your frontend URL later)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Create server for socket.io
const server = http.createServer(app);

// ✅ FIX 2: Socket config for production
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (relationId) => {
    socket.join(relationId);
    console.log(`User joined room: ${relationId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io accessible in routes
app.set("io", io);

// Test route
app.get("/", (req, res) => {
  res.send("Rental Management backend is running 🚀");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/landlord", landlordRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/properties", PropertyRouter);
app.use("/api/leases", leaseRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/messages", messageRoutes);

// ✅ FIX 3: Connect DB BEFORE starting server
connectDB();

// Port (Render gives dynamic port)
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});