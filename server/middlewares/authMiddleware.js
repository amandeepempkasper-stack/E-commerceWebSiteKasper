import jwt from "jsonwebtoken";
import User from "../models/User.js"; // adjust path as needed

export const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id); // ✅ Fetch user
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // ✅ Attach full user object
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};


export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
};
