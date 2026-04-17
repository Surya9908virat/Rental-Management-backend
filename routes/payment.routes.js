import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js"; 
import { payRent,myPayments,landlordPayments } from "../controllers/payment.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();
router.post("/pay", authMiddleware, roleMiddleware("tenant"), upload.single("image"), payRent);
router.get("/my-payments", authMiddleware, roleMiddleware("tenant"), myPayments);
router.get("/landlord-payments", authMiddleware, roleMiddleware("landlord"), landlordPayments);

export default router;