import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createRequest, myRequests, landlordRequests, updateStatus, getRequest } from "../controllers/maintenance.controller.js";
import roleMiddleware from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();
router.post("/", authMiddleware, roleMiddleware("tenant"), upload.array("files", 5), createRequest);
router.get("/my", authMiddleware, roleMiddleware("tenant"), myRequests);
router.get("/landlord", authMiddleware, roleMiddleware("landlord"), landlordRequests);
router.get("/:id", authMiddleware, getRequest);
router.put("/:id", authMiddleware, roleMiddleware("landlord"), updateStatus);

export default router;