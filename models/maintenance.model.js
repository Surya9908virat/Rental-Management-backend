import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema({
    lease : { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
    tenant : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    landlord : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title : { type: String, required: true },
    description : { type: String, required: true },
    urgency : { type: String, enum: ["low", "medium", "high"], default: "low" },
    status : { type: String, enum: ["submitted", "in-progress", "resolved"], default: "submitted" },
    images : [{ type: String }], 
    timeline: [
      {
        status: String,
        message: String,
        date: { type: Date, default: Date.now }
      }
    ],
}, { timestamps: true });

export default mongoose.model('Maintenance', maintenanceSchema);