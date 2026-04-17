import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createProperty, getMyProperties, getAllProperties } from "../controllers/property.controller.js";
import roleMiddleware from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("landlord"), upload.array("images", 10), createProperty);
router.get("/my", authMiddleware, roleMiddleware("landlord"), getMyProperties);
router.get("/all", authMiddleware, getAllProperties);

export default router;
