import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import roleMiddleware from "../middleware/role.middleware.js";
import {
  createLease,
  acceptLease,
  rejectLease,
  deleteLease,
  getAvailableLeases,
} from "../controllers/lease.controller.js";
import Lease from "../models/lease.model.js";
import Payment from "../models/payment.model.js";

import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// Create Lease (Landlord)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("landlord"),
  upload.array("lease_documents", 5),
  createLease
);

// Get Tenant Leases
router.get(
  "/my-leases",
  authMiddleware,
  roleMiddleware("tenant"),
  async (req, res) => {
    try {
      const leases = await Lease.find({
        tenant: req.user._id,
      }).populate("property").populate("landlord", "name email upiId phoneNumber");

      // Check current month payments for each lease
      const startOfMonth = new Date();
      startOfMonth.setHours(0, 0, 0, 0);
      startOfMonth.setDate(1);

      const endOfMonth = new Date();
      endOfMonth.setHours(23, 59, 59, 999);
      endOfMonth.setMonth(endOfMonth.setMonth(endOfMonth.getMonth() + 1));
      endOfMonth.setDate(0);

      const leasesWithPaymentStatus = await Promise.all(leases.map(async (lease) => {
        const payment = await Payment.findOne({
          lease: lease._id,
          status: "paid",
          createdAt: { $gte: startOfMonth }
        });

        return {
          ...lease.toObject(),
          isPaidThisMonth: !!payment
        };
      }));

      res.json(leasesWithPaymentStatus);
    } catch (error) {
      console.error("GET MY LEASES ERROR:", error);
      res.status(500).json({ message: "Server error fetching leases" });
    }
  }
);

// Get Available Lease Offers (Marketplace)
router.get(
  "/available",
  authMiddleware,
  roleMiddleware("tenant"),
  getAvailableLeases
);

// Get Landlord Leases
router.get(
  "/landlord",
  authMiddleware,
  roleMiddleware("landlord"),
  async (req, res) => {
    try {
      const leases = await Lease.find({
        landlord: req.user._id,
      }).populate("property").populate("tenant");

      res.json(leases);
    } catch (e) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Accept Lease
router.post(
  "/:id/accept",
  authMiddleware,
  roleMiddleware("tenant"),
  acceptLease
);

// Reject Lease
router.post(
  "/:id/reject",
  authMiddleware,
  roleMiddleware("tenant"),
  rejectLease
);

// Delete Lease
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("landlord"),
  deleteLease
);

export default router;
