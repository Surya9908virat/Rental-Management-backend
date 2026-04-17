import Property from "../models/property.model.js";
import cloudinary from "../config/cloudinary.js";

// Create Property (Landlord)
export const createProperty = async (req, res) => {
    try {
        const { name, address, description, price } = req.body;

        const imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(
                    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
                    { folder: "rental-management/properties", resource_type: "auto" }
                );
                imageUrls.push(result.secure_url);
            }
        }

        const property = await Property.create({
            name: name || "Untitled Property",
            address: address || "",
            description: description || "",
            price: Number(price) || 0,
            images: imageUrls,
            landlord: req.user._id
        });

        res.status(201).json({
            message: "Property created successfully",
            property
        });
    } catch (error) {
        console.error("CREATE PROPERTY ERROR:", error);
        res.status(500).json({ message: "Failed to create property", error: error.message });
    }
};

// Get All Available Properties (Public/Tenant)
export const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find({ status: "available" }).populate("landlord", "name email profilePicture phoneNumber upiId");
        res.json(properties);
    } catch (error) {
        console.error("GET ALL PROPERTIES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch marketplace" });
    }
};

// Get All Properties for current Landlord
export const getMyProperties = async (req, res) => {
    try {
        const properties = await Property.find({ landlord: req.user._id });
        res.json(properties);
    } catch (error) {
        console.error("GET MY PROPERTIES ERROR:", error);
        res.status(500).json({ message: "Failed to fetch properties" });
    }
};