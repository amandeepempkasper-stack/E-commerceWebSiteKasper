import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js"; // make sure path is correct
import dotenv from "dotenv";
dotenv.config();

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    // Prevent duplicate
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Create user in unverified state
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profileImage,
      emailVerificationOTP: otp,
      emailVerificationExpires: otpExpires,
      isVerified: false,
    });
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"MyApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your verification OTP",
      html: `<p>Hi ${name},</p><p>Your signup OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    };
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent to email", email });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password!" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("Received email for reset:", email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("No user found for email:", email);
      return res.status(404).json({ message: "Email not found." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    console.log("Generated token:", token);

    // Save token & expiry
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log("Token saved to user");

    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Make sure this is a valid App Password!
      },
    });

    const resetUrl = `http://localhost:5173/reset-password/${token}`;
    const mailOptions = {
      to: user.email,
      subject: "Password Reset",
      html: `<p>You requested to reset your password.</p>
             <a href="${resetUrl}">Click here to reset</a>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent to:", user.email);

    res.json({ message: "Reset link sent to email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Token is invalid or expired." });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });
    if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

    if (
      user.emailVerificationOTP !== otp ||
      user.emailVerificationExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark verified
    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      message: "Email verified and user registered",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("verifyEmail error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// export const isAuthenticated = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Not authorized, no token" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.id).select("-password");
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token failed" });
//   }
// };