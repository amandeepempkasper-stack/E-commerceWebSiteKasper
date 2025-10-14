import Product from "../models/Product.js";
import { syncCategoryWithProduct } from "./categoryController.js";
import { randomUUID } from "crypto";

// Helper: generate SEO-friendly slug from title
const makeSlug = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with -
    .replace(/(^-|-$)+/g, ""); // remove leading/trailing -

// ✅ POST /add-product
export const addProduct = async (req, res) => {
  try {
    const {
      uuid,
      route,
      title,
      category,
      subcategory,
      SKU,
      dimension,
      basePrice,
      amazonPrice,
      discountPercent,
      materialType,
      stockQuantity,
      color,
      returnPolicy,
      weight,
      type,
      description,
      tags,
      deliverBy,
      bulletPoints,
    } = req.body;

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // 🔹 Validate required fields
    if (!title || !category || !SKU || !basePrice || !type) {
      return res.status(400).json({
        message:
          "Missing required fields: title, category, SKU, basePrice, type",
      });
    }

    // Save uploaded images
    const imagePaths = Array.isArray(req.files)
      ? req.files.map((file) => `/uploads/products/${file.filename}`)
      : [];

    // Sync categories
    await syncCategoryWithProduct(category, subcategory);

    const normalizeField = (field, separator = ",") => {
      if (!field) return [];
      if (Array.isArray(field)) return field.map((f) => f.trim());
      if (typeof field === "string")
        return field.split(separator).map((f) => f.trim());
      return [];
    };

    const product = new Product({
      uuid: uuid || randomUUID(),
      route: route || `/product/${makeSlug(title)}-${SKU}`, // auto slug
      title,
      category,
      subcategory,
      SKU,
      dimension,
      basePrice,
      amazonPrice,
      discountPercent,
      materialType: normalizeField(materialType), // ✅ works with string OR array
      stockQuantity,
      color: normalizeField(color), // ✅ works with string OR array
      returnPolicy,
      weight,
      type,
      description,
      tags: normalizeField(tags), // ✅ works with string OR array
      image: imagePaths,
      deliverBy: deliverBy ? Number(deliverBy) : 3, // default 3 days
      bulletPoints: normalizeField(bulletPoints, "|"), // ✅ handles "|" separator
    });

    await product.save();
    res.status(201).json({
      message: "✅ Product created successfully",
      product,
    });
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /all
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name email profileImage",
        },
      })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /category/:categoryName
export const getProductByCategory = async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.categoryName).trim();

    const products = await Product.find({ category }).populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "name email profileImage",
      },
    });

    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /products/category/:categoryName/:subcategoryName
export const getProductsByCategoryAndSubcategory = async (req, res) => {
  try {
    const categoryName = decodeURIComponent(
      req.params.categoryName || ""
    ).trim();
    const subcategoryName = decodeURIComponent(
      req.params.subcategoryName || ""
    ).trim();

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const query = {
      category: { $regex: `^${escapeRegex(categoryName)}$`, $options: "i" },
    };

    if (subcategoryName) {
      query.subcategory = {
        $regex: `^${escapeRegex(subcategoryName)}$`,
        $options: "i",
      };
    }

    console.log("Final Query:", query);

    const products = await Product.find(query).populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "name email profileImage",
      },
    });

    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /product/:id (Mongo _id)
export const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "name email profileImage",
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /product/slug/:route
export const getProductByRoute = async (req, res) => {
  try {
    const { route } = req.params;

    const product = await Product.findOne({ route }).populate({
      path: "reviews",
      populate: { path: "user", select: "name email profileImage" },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET /categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          subcategories: { $addToSet: "$subcategory" }, // unique subcategories
        },
      },
      {
        $project: {
          name: "$_id",
          _id: 0,
          subcategories: 1,
        },
      },
    ]);

    res.status(200).json({ categories });
  } catch (err) {
    console.error("Get Categories Error:", err);
    res.status(500).json({ error: err.message });
  }
};
