import Payment from "../models/payment.model.js";
import Lease from "../models/lease.model.js";
import cloudinary from "../config/cloudinary.js";

export const payRent = async (req, res) => {
  try {
    const { leaseId, amount } = req.body;
    let imageUrl = "";

    if (req.file) {
      const originalFilename = req.file.originalname;
      const lastDotIndex = originalFilename.lastIndexOf('.');
      const filenameWithoutExt = lastDotIndex !== -1 ? originalFilename.substring(0, lastDotIndex) : originalFilename;

      const publicId = `receipt_${Date.now()}_${filenameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "rental-management/payments",
          resource_type: "auto",
          public_id: publicId
        }
      );
      imageUrl = result.secure_url;
    }

    console.log("PAY BODY:", req.body);

    const lease = await Lease.findById(leaseId).populate("property");

    console.log("LEASE:", JSON.stringify(lease, null, 2));

    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    if (lease.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (lease.status !== "active") {
      return res.status(400).json({ message: "Lease not active" });
    }

    // DUPLICATE CHECK: Prevent multiple payments for the same month
    const startOfMonth = new Date();
    startOfMonth.setHours(0, 0, 0, 0);
    startOfMonth.setDate(1);

    const endOfMonth = new Date();
    endOfMonth.setHours(23, 59, 59, 999);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);

    const existingPayment = await Payment.findOne({
      lease: leaseId,
      status: "paid",
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (existingPayment) {
      return res.status(400).json({ message: "Rent for this month has already been paid." });
    }

    // HEALING LOGIC: If landlord is missing on lease, try to get it from the property
    let landlordId = lease.landlord;
    if (!landlordId && lease.property && lease.property.landlord) {
      console.log("RECOVERED LandlordID from Property for payment:", lease.property.landlord);
      landlordId = lease.property.landlord;
    }

    if (!landlordId) {
      return res.status(400).json({ message: "Lease record is missing landlord information." });
    }

    console.log(`CREATING PAYMENT. Lease: ${leaseId}, Amount: ${amount}, Tenant: ${req.user._id}`);

    const payment = await Payment.create({
      lease: leaseId,
      tenant: req.user._id,
      landlord: landlordId,
      amount: Number(amount),
      status: "paid",
      image: imageUrl,
    });

    res.status(201).json({
      message: "Rent paid successfully",
      payment,
    });
  } catch (error) {
    console.error("PAYMENT PROCESS ERROR:", error);
    res.status(500).json({
      message: "Failed to process payment",
      error: error.message
    });
  }
};


export const myPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ tenant: req.user._id })
      .populate({
        path: "lease",
        populate: { path: "landlord", select: "name email upiId phoneNumber" }
      })
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

export const landlordPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ landlord: req.user._id })
      .populate("lease")
      .populate("tenant", "name email")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};
