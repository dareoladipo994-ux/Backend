const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// In-memory fallback store when mongoose isn't connected
let memoryStore = [];

const useMemory = () => !Recipe.db || !Recipe.db.client || Recipe.db.client.readyState !== 1;

// Create
router.post('/', async (req, res) => {
  const payload = req.body;
  if (useMemory()) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2,8);
    const doc = { ...payload, _id: id, createdAt: new Date() };
    memoryStore.push(doc);
    return res.status(201).json(doc);
  }
  try {
    const r = await Recipe.create(payload);
    res.status(201).json(r);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Read all
router.get('/', async (req, res) => {
  if (useMemory()) return res.json(memoryStore);
  const items = await Recipe.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Read one
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (useMemory()) {
    const r = memoryStore.find(x => x._id === id);
    return r ? res.json(r) : res.status(404).json({ message:'not found' });
  }
  const r = await Recipe.findById(id);
  if (!r) return res.status(404).json({ message:'not found' });
  res.json(r);
});

// Update
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  if (useMemory()) {
    const idx = memoryStore.findIndex(x => x._id === id);
    if (idx === -1) return res.status(404).json({ message:'not found' });
    memoryStore[idx] = { ...memoryStore[idx], ...payload };
    return res.json(memoryStore[idx]);
  }
  try {
    const updated = await Recipe.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message:'not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (useMemory()) {
    const idx = memoryStore.findIndex(x => x._id === id);
    if (idx === -1) return res.status(404).json({ message:'not found' });
    memoryStore.splice(idx,1);
    return res.json({ success: true });
  }
  const removed = await Recipe.findByIdAndDelete(id);
  if (!removed) return res.status(404).json({ message:'not found' });
  res.json({ success: true });
});

module.exports = router;
