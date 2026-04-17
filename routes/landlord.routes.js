import express from "express";
import roleMiddleware from "../middleware/role.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/dashboard", authMiddleware, roleMiddleware("landlord"), (req, res) => {
  res.json({
    message: "Landlord dashboard accessed",
    userId: req.user.id,});
});
export default router;