import express from "express";
import { register, login, findTenantByEmail, updateProfile, changePassword } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/find-tenant", authMiddleware, findTenantByEmail);
router.put("/profile", authMiddleware, upload.single("profilePicture"), updateProfile);
router.put("/change-password", authMiddleware, changePassword);

export default router;
