const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
dotenv.config();

const Recipe = require('./models/Recipe');
const recipeRoutes = require('./routes/recipes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB if provided; otherwise keep in-memory fallback (for MVP/testing)
const MONGO_URI = process.env.MONGO_URI || null;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(()=> console.log('MongoDB connected'))
    .catch(err => {
      console.error('Mongo connection error:', err);
      // continue in memory if connection fails
    });
} else {
  console.log('No MONGO_URI provided — running with in-memory store (not persistent).');
}

app.use('/api/recipes', recipeRoutes);

// shopping list endpoint (aggregates ingredients from provided recipe IDs or recipe objects)
// Accepts { recipes: [ { _id, servingsOverride, scale } or recipeId strings ] }
app.post('/api/shopping-list', async (req, res) => {
  try {
    const { recipes } = req.body;
    if (!Array.isArray(recipes) || recipes.length === 0) return res.status(400).json({ message:'Provide an array of recipes or recipe ids' });

    // Normalize: if element is string -> fetch recipe; if object with _id -> fetch; if full object => use directly
    const resolved = [];
    for (const item of recipes) {
      if (typeof item === 'string') {
        const r = await Recipe.findById(item).lean();
        if (r) resolved.push({recipe: r, scale: 1});
      } else if (item && item._id) {
        const r = await Recipe.findById(item._id).lean();
        if (r) resolved.push({recipe: r, scale: item.scale || 1, servingsOverride: item.servingsOverride});
      } else if (item && item.title && item.ingredients) {
        resolved.push({recipe: item, scale: item.scale || 1, servingsOverride: item.servingsOverride});
      }
    }

    // Aggregate ingredients
    const agg = {};
    for (const entry of resolved) {
      const r = entry.recipe;
      let scale = entry.scale || 1;
      if (entry.servingsOverride && r.servings) {
        scale = entry.servingsOverride / r.servings;
      }
      for (const ing of r.ingredients || []) {
        // ingredient shape: {name, quantity, unit}
        const key = (ing.name || '').toLowerCase().trim() + '||' + (ing.unit||'').toLowerCase().trim();
        const qty = parseFloat(ing.quantity) || 0;
        agg[key] = agg[key] || { name: ing.name, unit: ing.unit || '', quantity: 0 };
        agg[key].quantity += qty * scale;
      }
    }

    // convert agg to array
    const list = Object.values(agg).map(it => ({
      name: it.name,
      quantity: Number.isFinite(it.quantity) ? Math.round(it.quantity * 100)/100 : it.quantity,
      unit: it.unit
    }));

    return res.json({ items: list });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message:'Server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
