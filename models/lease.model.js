import mongoose from "mongoose";
const leaseSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true, index: true },
        tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        rentAmount: { type: Number, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        landlord: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: { type: String, enum: ["pending", "active", "expired", "rejected"], default: "pending", index: true },
        lease_documents: [{ type: String }],
    },
    { timestamps: true }
);
const Lease = mongoose.model("Lease", leaseSchema);
export default Lease;