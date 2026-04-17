import express from "express";
import roleMiddleware from "../middleware/role.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, roleMiddleware("tenant"), (req, res) => {
  res.json({
    message: "Tenant dashboard accessed",
    userId: req.user.id,
  });
});

export default router;