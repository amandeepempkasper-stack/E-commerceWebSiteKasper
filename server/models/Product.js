import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  route: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String, trim: true },
  tags: { type: [String], default: [] },
  SKU: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  dimension: { type: String, trim: true },
  basePrice: { type: Number, required: true, min: 0 },
  amazonPrice: { type: Number, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  materialType: { type: [String], default: [] },
  color: { type: [String], default: [] },
  stockQuantity: { type: Number, default: 0, min: 0 },
  deliverBy: { type: Number, default: 3 },
  returnPolicy: { type: String, trim: true },
  weight: { type: String, trim: true },
  type: { type: String, enum: ["Framed", "Unframed"], required: true },
  description: { type: String, trim: true },
  image: {
    type: [String],
    validate: [(arr) => arr.length <= 4, "Maximum 4 images allowed"],
    default: [],
  },
  bulletPoints: { type: [String], default: [] },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
});

// ✅ Fix: prevent OverwriteModelError
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
