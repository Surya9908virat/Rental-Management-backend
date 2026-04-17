import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  res.status(201).json({
    token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }),
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber || "",
      profilePicture: user.profilePicture || "",
    },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json({
    token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }),
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      upiId: user.upiId || "",
      phoneNumber: user.phoneNumber || "",
      profilePicture: user.profilePicture || "",
    },
  });
};

export const findTenantByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase(), role: "tenant" }).select("name _id email");
    if (!user) {
      return res.status(404).json({ message: "Tenant not found with this email" });
    }
    res.json(user);
  } catch (error) {
    console.error("FIND TENANT ERROR:", error);
    res.status(500).json({ message: "Server error searching for tenant" });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, upiId, phoneNumber } = req.body;
    let profilePictureUrl = req.user.profilePicture;

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "rental-management/profiles", resource_type: "auto" }
      );
      profilePictureUrl = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, upiId, phoneNumber, profilePicture: profilePictureUrl },
      { new: true }
    ).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        upiId: updatedUser.upiId,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
      },
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    console.log("CHANGE PASSWORD attempt for:", req.user._id);

    // Explicitly find the user with the password field included
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      console.log("User not found during password change");
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("Password changed successfully for:", req.user._id);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR DETAILS:", error);
    res.status(500).json({ message: "Server error changing password", error: error.message });
  }
};
