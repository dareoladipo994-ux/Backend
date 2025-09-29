const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IngredientSchema = new Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: '' }
}, { _id: false });

const RecipeSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  servings: { type: Number, default: 1 },
  ingredients: [IngredientSchema],
  steps: [String],
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
