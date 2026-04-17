import Maintenance from "../models/maintenance.model.js";
import Lease from "../models/lease.model.js";
import cloudinary from "../config/cloudinary.js";

export const createRequest = async (req, res) => {
  try {
    const { leaseId, title, description, urgency } = req.body;
    console.log("CREATING MAINTENANCE REQUEST. LeaseID:", leaseId);
    const lease = await Lease.findById(leaseId).populate("property");
    if (!lease) {
      console.error("LEASE NOT FOUND for ID:", leaseId);
      return res.status(404).json({ message: "Lease not found" });
    }
    console.log("LEASE DATA (Populated Property):", JSON.stringify(lease, null, 2));

    if (lease.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // HEALING LOGIC: If landlord is missing on lease, try to get it from the property
    let landlordId = lease.landlord;
    if (!landlordId && lease.property && lease.property.landlord) {
      console.log("RECOVERED LandlordID from Property:", lease.property.landlord);
      landlordId = lease.property.landlord;
    }

    if (!landlordId) {
      console.error("CRITICAL: Lease and Property both missing landlord field!", lease);
      return res.status(400).json({
        message: "This lease record is incomplete (missing landlord info). Please contact support.",
        error: "landlord_not_found_on_lease_or_property"
      });
    }
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const originalFilename = file.originalname;
        const lastDotIndex = originalFilename.lastIndexOf('.');
        const filenameWithoutExt = lastDotIndex !== -1 ? originalFilename.substring(0, lastDotIndex) : originalFilename;

        const publicId = `maint_${Date.now()}_${filenameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            folder: "rental-management",
            resource_type: "auto",
            public_id: publicId
          }
        );
        images.push(result.secure_url);
      }
    }
    const request = await Maintenance.create({
      lease: leaseId,
      tenant: req.user._id,
      landlord: landlordId,
      title,
      description,
      urgency,
      images,
      status: "submitted",
      timeline: [
        {
          status: "submitted",
          message: "Maintenance request submitted by tenant",
          date: new Date()
        }
      ]
    });
    res.status(201).json({ message: "Maintenance request created", request });
  } catch (err) {
    console.error("MAINTENANCE CREATE ERROR:", err);
    return res.status(500).json({
      message: "Upload failed",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const myRequests = async (req, res) => {
  try {
    const requests = await Maintenance.find({ tenant: req.user._id }).populate("lease");
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch maintenance requests" });
  }
};

export const landlordRequests = async (req, res) => {
  try {
    const requests = await Maintenance.find({ landlord: req.user._id }).populate("lease").populate("tenant");
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`UPDATING MAINTENANCE STATUS. ID: ${req.params.id}, New Status: ${status}`);

    const request = await Maintenance.findById(req.params.id);

    if (!request) {
      console.error("Maintenance request not found with ID:", req.params.id);
      return res.status(404).json({ message: "Request not found" });
    }

    // HEALING LOGIC: If landlord is missing on old records, try to recover it from the lease/property
    if (!request.landlord) {
      console.log("HEALING: Maintenance record missing landlord. Checking lease...");
      const populatedLease = await Lease.findById(request.lease).populate("property");
      if (populatedLease) {
        request.landlord = populatedLease.landlord || (populatedLease.property && populatedLease.property.landlord);
        if (request.landlord) {
          console.log("HEALING SUCCESS: Recovered landlord ID", request.landlord);
          await request.save();
        }
      }
    }

    if (!request.landlord || request.landlord.toString() !== req.user._id.toString()) {
      console.error("UNAUTHORIZED STATUS UPDATE. Req Landlord:", request.landlord, "Current User:", req.user._id);
      return res.status(403).json({ message: "Unauthorized" });
    }

    request.status = status.toLowerCase(); // Ensure lowercase

    // Push to timeline if message provided
    const timelineEntry = {
      status: status,
      message: req.body.message || `Status updated to ${status}`,
      date: new Date()
    };

    if (!request.timeline) request.timeline = [];
    request.timeline.push(timelineEntry);

    await request.save();

    // SOCKET EMIT: Real-time update for maintenance status
    const io = req.app.get("io");
    if (io) {
      io.to(request.lease.toString()).emit("maintenance-update", {
        requestId: request._id,
        status: request.status,
        timeline: request.timeline
      });
    }

    res.json({
      message: "Updated successfully",
      request
    });
  } catch (err) {
    console.error("MAINTENANCE STATUS UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update maintenance request", error: err.message });
  }
};

export const getRequest = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id)
      .populate("lease")
      .populate("tenant");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Check authorization: must be the tenant or the landlord
    if (
      request.tenant.toString() !== req.user._id.toString() &&
      request.landlord.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};