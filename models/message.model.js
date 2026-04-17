import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    relationId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Can be maintenanceRequestId or direct chat ID
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
