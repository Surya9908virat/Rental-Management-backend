import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(  {
  lease: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentDate: { type: Date, default: Date.now },
    image: { type: String },
},
{ timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);