import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { sendMessage, getMessages, getConversations, searchUsers, markAsRead } from "../controllers/message.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/conversations", getConversations);
router.get("/search-users", searchUsers);
router.post("/mark-read", markAsRead);
router.post("/", sendMessage);
router.get("/:relationId", getMessages);

export default router;
