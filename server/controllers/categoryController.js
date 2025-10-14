import Category from "../models/Category.js";

/**
 * Adds a new category or updates existing one with subcategory.
 * @param {string} categoryName
 * @param {string} subcategoryName
 */
export const syncCategoryWithProduct = async (
  categoryName,
  subcategoryName
) => {
  const existingCategory = await Category.findOne({ name: categoryName });

  if (!existingCategory) {
    // Create new category with initial subcategory
    await Category.create({
      name: categoryName,
      subcategories: [subcategoryName],
    });
  } else if (!existingCategory.subcategories.includes(subcategoryName)) {
    // Add subcategory if it's new
    existingCategory.subcategories.push(subcategoryName);
    await existingCategory.save();
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
