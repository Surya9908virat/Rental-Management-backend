import Lease from "../models/lease.model.js";
import cloudinary from "../config/cloudinary.js";

// Create Lease (Landlord)
export const createLease = async (req, res) => {
  try {
    const { propertyId, tenantId, startDate, endDate, rentAmount } = req.body;
    const leaseDocuments = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Use 'auto' to let Cloudinary detect the file type (image or raw/pdf)
        // AND strip the extension from the public_id to avoid double extensions like .pdf.pdf
        const originalFilename = file.originalname;
        const lastDotIndex = originalFilename.lastIndexOf('.');
        const filenameWithoutExt = lastDotIndex !== -1 ? originalFilename.substring(0, lastDotIndex) : originalFilename;

        const publicId = `lease_${Date.now()}_${filenameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            folder: "rental-management/leases",
            resource_type: "auto",
            public_id: publicId
          }
        );
        leaseDocuments.push(result.secure_url);
      }
    }

    const lease = await Lease.create({
      property: propertyId,
      tenant: tenantId || null,
      landlord: req.user._id,
      startDate,
      endDate,
      rentAmount,
      status: "pending",
      lease_documents: leaseDocuments
    });

    res.status(201).json({
      message: "Lease created successfully",
      lease,
    });
  } catch (error) {
    console.error("CREATE LEASE ERROR:", error);
    res.status(500).json({ message: "Failed to create lease", error: error.message });
  }
};

// Accept Lease (Tenant)
export const acceptLease = async (req, res) => {
  try {
    const leaseId = req.params.id;

    const lease = await Lease.findById(leaseId);

    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    // If lease has a tenant, only that tenant can accept
    if (lease.tenant) {
      if (lease.tenant.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
    } else {
      // If no tenant, current tenant becomes the lease holder
      lease.tenant = req.user._id;
    }

    if (lease.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    lease.status = "active";
    await lease.save();

    res.json({
      message: "Lease accepted successfully",
      lease,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ... existing rejectLease ...

export const getAvailableLeases = async (req, res) => {
  try {
    const leases = await Lease.find({ tenant: null, status: "pending" })
      .populate("property")
      .populate("landlord", "name email upiId phoneNumber");
    res.json(leases);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch available leases" });
  }
};

// Reject Lease (Tenant)
export const rejectLease = async (req, res) => {
  try {
    const leaseId = req.params.id;

    const lease = await Lease.findById(leaseId);

    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    if (lease.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (lease.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    lease.status = "rejected";
    await lease.save();

    res.json({
      message: "Lease rejected",
      lease,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Lease (Landlord)
export const deleteLease = async (req, res) => {
  try {
    const leaseId = req.params.id;
    const lease = await Lease.findById(leaseId);

    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    // Only landlord can delete
    if (lease.landlord.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Lease.findByIdAndDelete(leaseId);

    res.json({ message: "Lease deleted successfully" });
  } catch (error) {
    console.error("DELETE LEASE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
