/**
 * Shared validation / sanitising for admin-managed catalog items
 * (categories, software products, services).
 *
 * Every admin write goes through a whitelist here — request bodies are never
 * Object.assign'ed onto documents, so unknown or internal fields can't be set.
 */
import mongoose from 'mongoose';
import { SOFTWARE_PRICING_TYPES, SOFTWARE_CTA_TYPES } from '../models/Software.js';
import { SERVICE_PRICING_TYPES, SERVICE_CTA_TYPES, SERVICE_ICONS } from '../models/Service.js';

export const CATEGORY_KINDS = ['course', 'software', 'service'];

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const has = (body, key) => Object.prototype.hasOwnProperty.call(body, key);

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Accept http(s) URLs and site-relative upload paths only (blocks javascript:, data: etc.). */
export const cleanUrl = (value, { allowRelative = true } = {}) => {
  const v = str(value, 1000);
  if (!v) return '';
  if (/^https?:\/\/[^\s<>"']+$/i.test(v)) return v;
  if (allowRelative && /^\/(api\/)?uploads\/[^\s<>"']+$/i.test(v)) return v;
  return null; // invalid
};

const toList = (value, { maxItems, maxLen }) => {
  const arr = Array.isArray(value) ? value : (typeof value === 'string' ? value.split('\n') : []);
  return arr.map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems);
};

const toMoney = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return null;
  return Math.round(n * 100) / 100;
};

const toOrder = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  return n;
};

export const isValidId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);

/** Generate a slug that is unique within `Model` (optionally ignoring the doc being edited). */
export const uniqueSlug = async (Model, base, excludeId = null, extraFilter = {}) => {
  const root = slugify(base) || 'item';
  let candidate = root;
  for (let i = 2; i < 200; i += 1) {
    const filter = { ...extraFilter, slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const clash = await Model.exists(filter);
    // Avoid slugs that look like Mongo ids (the public routes accept either)
    if (!clash && !mongoose.isValidObjectId(candidate)) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
};

const common = (body, partial, errors, data) => {
  if (!partial || has(body, 'title')) {
    const title = str(body.title, 120);
    if (!title) errors.push('Name is required (max 120 characters).');
    data.title = title;
  }
  if (has(body, 'slug')) {
    const s = slugify(body.slug);
    if (str(body.slug, 200) && !s) errors.push('Slug may only contain letters, numbers and dashes.');
    data.slug = s; // empty → auto-generated from the name
  }
  if (has(body, 'description')) data.description = str(body.description, 20000);
  if (has(body, 'category')) data.category = str(body.category, 60);
  if (has(body, 'highlightBadge')) data.highlightBadge = str(body.highlightBadge, 30);
  if (has(body, 'isFeatured')) data.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
  if (has(body, 'status')) {
    if (!['active', 'draft', 'archived'].includes(body.status)) errors.push('Visibility must be active, draft or archived.');
    else data.status = body.status;
  }
  if (has(body, 'order')) {
    const o = toOrder(body.order);
    if (o === null) errors.push('Order must be a whole number between 0 and 999.');
    else data.order = o;
  }
  if (has(body, 'thumbnail')) {
    const u = cleanUrl(body.thumbnail);
    if (u === null) errors.push('Image must be an https:// URL or an uploaded file.');
    else data.thumbnail = u;
  }
  for (const key of ['price', 'discountedPrice', 'startingPrice']) {
    if (has(body, key)) {
      const m = toMoney(body[key]);
      if (m === null) errors.push(`${key} must be a positive number.`);
      else data[key] = m;
    }
  }
};

export const validateSoftwareInput = (body = {}, { partial = false } = {}) => {
  const errors = [];
  const data = {};
  common(body, partial, errors, data);
  if (has(body, 'tagline')) data.tagline = str(body.tagline, 160);
  if (has(body, 'features')) data.features = toList(body.features, { maxItems: 30, maxLen: 200 });
  if (has(body, 'images')) {
    const raw = toList(body.images, { maxItems: 8, maxLen: 1000 });
    const imgs = raw.map((u) => cleanUrl(u));
    if (imgs.some((u) => u === null)) errors.push('Screenshots must be https:// URLs or uploaded files.');
    else data.images = imgs;
  }
  if (!partial || has(body, 'pricingType')) {
    const pt = body.pricingType || 'one_time';
    if (!SOFTWARE_PRICING_TYPES.includes(pt)) errors.push('Invalid pricing type.');
    else data.pricingType = pt;
  }
  if (!partial || has(body, 'ctaType')) {
    const ct = body.ctaType || 'enquire';
    if (!SOFTWARE_CTA_TYPES.includes(ct)) errors.push('Invalid call-to-action type.');
    else data.ctaType = ct;
  }
  for (const key of ['demoUrl', 'documentationUrl']) {
    if (has(body, key)) {
      const u = cleanUrl(body[key], { allowRelative: false });
      if (u === null) errors.push(`${key === 'demoUrl' ? 'Demo link' : 'Documentation link'} must start with https://`);
      else data[key] = u;
    }
  }
  if (has(body, 'downloadUrl')) {
    const u = cleanUrl(body.downloadUrl);
    if (u === null) errors.push('Download URL must be https:// or an uploaded package.');
    else data.downloadUrl = u;
  }
  if (has(body, 'fileName')) data.fileName = str(body.fileName, 200).replace(/[\\/]/g, '');
  if (has(body, 'fileSize')) data.fileSize = str(body.fileSize, 30);
  if (has(body, 'version')) data.version = str(body.version, 30);
  if (has(body, 'couponEligible')) data.couponEligible = body.couponEligible === true || body.couponEligible === 'true';

  const pt = data.pricingType;
  if (pt && pt !== 'quote' && !partial && !(data.price > 0)) {
    errors.push('Please enter a price, or choose "Contact for quote".');
  }
  if (data.discountedPrice !== undefined && data.price !== undefined && data.discountedPrice > data.price) {
    errors.push('Discounted price cannot be higher than the price.');
  }
  return errors.length ? { error: errors.join(' ') } : { data };
};

export const validateServiceInput = (body = {}, { partial = false } = {}) => {
  const errors = [];
  const data = {};
  // Accept "price" as an alias of the stored startingPrice field
  const { price, ...rest } = body;
  const input = price !== undefined && !has(rest, 'startingPrice') ? { ...rest, startingPrice: price } : rest;
  common(input, partial, errors, data);
  if (has(input, 'summary')) data.summary = str(input.summary, 240);
  if (has(input, 'deliverables')) data.deliverables = toList(input.deliverables, { maxItems: 30, maxLen: 200 });
  if (has(input, 'processSteps')) {
    const steps = Array.isArray(input.processSteps) ? input.processSteps : [];
    data.processSteps = steps
      .map((s) => ({ title: str(s?.title, 80), description: str(s?.description, 300) }))
      .filter((s) => s.title)
      .slice(0, 10);
  }
  if (!partial || has(input, 'pricingType')) {
    const pt = input.pricingType || 'quote';
    if (!SERVICE_PRICING_TYPES.includes(pt)) errors.push('Invalid pricing type.');
    else data.pricingType = pt;
  }
  if (!partial || has(input, 'ctaType')) {
    const ct = input.ctaType || 'enquire';
    if (!SERVICE_CTA_TYPES.includes(ct)) errors.push('Invalid call-to-action type.');
    else data.ctaType = ct;
  }
  if (has(input, 'icon')) {
    if (input.icon && !SERVICE_ICONS.includes(input.icon)) errors.push('Invalid icon.');
    else data.icon = input.icon || 'briefcase';
  }
  if (has(input, 'couponEligible')) data.couponEligible = input.couponEligible === true || input.couponEligible === 'true';
  const pt = data.pricingType;
  if (pt && pt !== 'quote' && !partial && !(data.startingPrice > 0)) {
    errors.push('Please enter a price, or choose "Quote on request".');
  }
  return errors.length ? { error: errors.join(' ') } : { data };
};

export const validateCategoryInput = (body = {}, { partial = false } = {}) => {
  const errors = [];
  const data = {};
  if (!partial || has(body, 'kind')) {
    if (!CATEGORY_KINDS.includes(body.kind)) errors.push('Category type must be course, software or service.');
    else data.kind = body.kind;
  }
  if (!partial || has(body, 'name')) {
    const name = str(body.name, 60);
    if (!name) errors.push('Category name is required (max 60 characters).');
    else data.name = name;
  }
  if (has(body, 'order')) {
    const o = toOrder(body.order);
    if (o === null) errors.push('Order must be a whole number between 0 and 999.');
    else data.order = o;
  }
  if (has(body, 'isVisible')) data.isVisible = body.isVisible === true || body.isVisible === 'true';
  return errors.length ? { error: errors.join(' ') } : { data };
};

/** Public view of a software product — never exposes the paid download location. */
export const publicSoftware = (doc) => {
  const s = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  delete s.downloadUrl;
  delete s.filePath;
  delete s.fileName;
  delete s.__v;
  return s;
};

export const publicService = (doc) => {
  const s = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  delete s.enquiryCount;
  delete s.__v;
  return s;
};

/** Public ordering: explicit order (asc), then featured, then newest. */
export const CATALOG_SORT = { order: 1, isFeatured: -1, createdAt: -1 };
