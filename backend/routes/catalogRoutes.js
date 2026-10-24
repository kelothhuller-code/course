import express from 'express';
import Category from '../models/Category.js';
import Course from '../models/Course.js';
import Software from '../models/Software.js';
import Service from '../models/Service.js';
import EnquiryCategory from '../models/EnquiryCategory.js';
import { protect, admin } from '../middleware/auth.js';
import { CATEGORY_KINDS, validateCategoryInput, slugify, isValidId } from '../utils/catalog.js';
import { ensureEnquiryCategories, validateEnquiryCategoryInput } from '../utils/enquiryForm.js';
import { DEFAULT_ENQUIRY_CATEGORIES } from '../utils/enquiryDefaults.js';

/** Express 4 doesn't catch rejected promises — forward them to the error handler. */
const wrapAsync = (router) => {
  for (const m of ['get', 'post', 'put', 'delete', 'patch']) {
    const orig = router[m].bind(router);
    router[m] = (path, ...handlers) => orig(path, ...handlers.map((fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)));
  }
  return router;
};

const MODEL_FOR_KIND = { course: Course, software: Software, service: Service };

// ---------------------------------------------------------------------------
// Public: GET /api/categories?kind=course|software|service
// ---------------------------------------------------------------------------
export const publicCategoryRouter = wrapAsync(express.Router());

publicCategoryRouter.get('/', async (req, res) => {
  try {
    const kind = CATEGORY_KINDS.includes(req.query.kind) ? req.query.kind : null;
    const filter = { isVisible: true, ...(kind ? { kind } : {}) };
    const categories = await Category.find(filter).sort({ order: 1, name: 1 }).select('kind name slug order').lean();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Category list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
});

// ---------------------------------------------------------------------------
// Admin: /api/admin/catalog/...  (JWT + admin role required for everything)
// ---------------------------------------------------------------------------
export const adminCatalogRouter = wrapAsync(express.Router());
adminCatalogRouter.use(protect, admin);

/** Categories with how many items use each one. */
adminCatalogRouter.get('/categories', async (req, res) => {
  try {
    const kind = CATEGORY_KINDS.includes(req.query.kind) ? req.query.kind : null;
    const categories = await Category.find(kind ? { kind } : {}).sort({ kind: 1, order: 1, name: 1 }).lean();
    const withCounts = await Promise.all(categories.map(async (c) => ({
      ...c,
      itemCount: await MODEL_FOR_KIND[c.kind].countDocuments({ category: c.name }),
    })));
    // Category names used by items that have no managed category yet (handy for "adopt")
    const unmanaged = {};
    for (const k of kind ? [kind] : CATEGORY_KINDS) {
      const used = (await MODEL_FOR_KIND[k].distinct('category')).filter(Boolean);
      const managed = new Set(categories.filter((c) => c.kind === k).map((c) => c.name));
      unmanaged[k] = used.filter((n) => !managed.has(n));
    }
    res.json({ success: true, categories: withCounts, unmanaged });
  } catch (err) {
    console.error('Admin categories error:', err);
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

adminCatalogRouter.post('/categories', async (req, res) => {
  const { data, error } = validateCategoryInput(req.body);
  if (error) return res.status(400).json({ message: error });
  data.slug = slugify(data.name);
  if (!data.slug) return res.status(400).json({ message: 'Category name must contain letters or numbers.' });
  if (await Category.exists({ kind: data.kind, slug: data.slug })) {
    return res.status(409).json({ message: `A ${data.kind} category called “${data.name}” already exists.` });
  }
  if (data.order === undefined) {
    const last = await Category.findOne({ kind: data.kind }).sort({ order: -1 }).lean();
    data.order = last ? Math.min(999, (last.order || 0) + 1) : 1;
  }
  const category = await Category.create(data);
  res.status(201).json({ success: true, category });
});

/** Rename / reorder / show-hide. Renaming also updates every item using the old name. */
adminCatalogRouter.put('/categories/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  const { data, error } = validateCategoryInput({ ...req.body, kind: category.kind }, { partial: true });
  if (error) return res.status(400).json({ message: error });

  let renamed = 0;
  if (data.name && data.name !== category.name) {
    const slug = slugify(data.name);
    if (!slug) return res.status(400).json({ message: 'Category name must contain letters or numbers.' });
    if (await Category.exists({ kind: category.kind, slug, _id: { $ne: category._id } })) {
      return res.status(409).json({ message: `Another ${category.kind} category is already called “${data.name}”.` });
    }
    const r = await MODEL_FOR_KIND[category.kind].updateMany({ category: category.name }, { $set: { category: data.name } });
    renamed = r.modifiedCount || 0;
    category.name = data.name;
    category.slug = slug;
  }
  if (data.order !== undefined) category.order = data.order;
  if (data.isVisible !== undefined) category.isVisible = data.isVisible;
  await category.save();
  res.json({ success: true, category, renamedItems: renamed });
});

/** Swap positions: body { ids: [...] } in the desired order. */
adminCatalogRouter.post('/categories/reorder', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isValidId).slice(0, 200) : [];
  if (!ids.length) return res.status(400).json({ message: 'Provide ids in the new order.' });
  await Promise.all(ids.map((id, i) => Category.updateOne({ _id: id }, { $set: { order: i + 1 } })));
  res.json({ success: true });
});

adminCatalogRouter.delete('/categories/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found.' });
  const inUse = await MODEL_FOR_KIND[category.kind].countDocuments({ category: category.name });
  if (inUse > 0) {
    return res.status(409).json({ message: `“${category.name}” is used by ${inUse} item(s). Move them to another category (or hide this one) before deleting.` });
  }
  await category.deleteOne();
  res.json({ success: true });
});

// ---- Smart enquiry form: categories + questions -------------------------
adminCatalogRouter.get('/enquiry-categories', async (req, res) => {
  await ensureEnquiryCategories();
  const categories = await EnquiryCategory.find().sort({ order: 1, label: 1 }).lean();
  res.json({ success: true, categories });
});

adminCatalogRouter.post('/enquiry-categories', async (req, res) => {
  const { data, error } = validateEnquiryCategoryInput(req.body);
  if (error) return res.status(400).json({ message: error });
  if (await EnquiryCategory.exists({ key: data.key })) return res.status(409).json({ message: `Key “${data.key}” already exists.` });
  const category = await EnquiryCategory.create(data);
  res.status(201).json({ success: true, category });
});

adminCatalogRouter.put('/enquiry-categories/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
  const existing = await EnquiryCategory.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Not found.' });
  // The key is what stored leads reference — keep it stable on edit
  const { data, error } = validateEnquiryCategoryInput({ ...req.body, key: existing.key });
  if (error) return res.status(400).json({ message: error });
  Object.assign(existing, data);
  await existing.save();
  res.json({ success: true, category: existing });
});

adminCatalogRouter.delete('/enquiry-categories/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id.' });
  await EnquiryCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/** Re-add any default category that was deleted (never overwrites edited ones). */
adminCatalogRouter.post('/enquiry-categories/restore-defaults', async (req, res) => {
  let added = 0;
  for (const def of DEFAULT_ENQUIRY_CATEGORIES) {
    if (!(await EnquiryCategory.exists({ key: def.key }))) {
      await EnquiryCategory.create(def);
      added += 1;
    }
  }
  res.json({ success: true, added });
});
