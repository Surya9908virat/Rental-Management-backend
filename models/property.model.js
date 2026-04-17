import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true, default: 0 },
        images: [{ type: String }],
        landlord: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["available", "rented"], default: "available" },
    },
    { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);
export default Property;