import e from "express";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["landlord", "tenant"],
      required: true,
    },
    upiId: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("User", userSchema);