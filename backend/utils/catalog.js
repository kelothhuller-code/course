/**
 * Shared validation / sanitising for admin-managed catalog items
 * (categories, software products, services).
 *
 * Every admin write goes through a whitelist here — request bodies are never
 * Object.assign'ed onto documents, so unknown or internal fields can't be set.
 */
import mongoose from 'mongoose';
import { SOFTWARE_PRICING_TYPES, SOFTWARE_CTA_TYPES, PLAN_BILLING } from '../models/Software.js';
import { SERVICE_PRICING_TYPES, SERVICE_CTA_TYPES, SERVICE_ICONS, SERVICE_PURCHASE_MODES } from '../models/Service.js';
import { GST_RATES, taxSettingsFor } from './gst.js';

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

const bool = (v) => v === true || v === 'true';

/**
 * GST fields shared by courses, software, plans, services and packages.
 * gstRate: '' / null → use the default (store-wide or parent item); else one of the GST slabs.
 * gstInclusive: true/false, or null (inherit) when allowInherit.
 * hsnSacCode: 4–8 digits or empty. TODO(owner): confirm codes with your CA.
 */
export const gstInput = (body, errors, data, label = '', { allowInherit = false } = {}) => {
  const p = label ? `${label}: ` : '';
  if (has(body, 'gstRate')) {
    const v = body.gstRate;
    if (v === '' || v === null || v === undefined) data.gstRate = null;
    else if (!GST_RATES.includes(Number(v))) errors.push(`${p}GST rate must be one of ${GST_RATES.join(', ')} (or empty for the default).`);
    else data.gstRate = Number(v);
  }
  if (has(body, 'gstInclusive')) {
    const v = body.gstInclusive;
    if (allowInherit && (v === '' || v === null || v === 'inherit')) data.gstInclusive = null;
    else data.gstInclusive = !(v === false || v === 'false' || v === 'exclusive');
  }
  if (has(body, 'hsnSacCode')) {
    const code = str(body.hsnSacCode, 12).replace(/\s/g, '');
    if (code && !/^[0-9]{4,8}$/.test(code)) errors.push(`${p}HSN/SAC must be 4–8 digits (or empty).`);
    else data.hsnSacCode = code;
  }
};

const idOrNew = (v) => (isValidId(String(v || '')) ? String(v) : undefined);

const toPlans = (value, errors) => {
  const arr = Array.isArray(value) ? value.slice(0, 12) : [];
  return arr.map((raw, i) => {
    const p = raw || {};
    const label = `Plan ${i + 1}`;
    const plan = { name: str(p.name, 60) };
    const id = idOrNew(p._id);
    if (id) plan._id = id;
    if (!plan.name) errors.push(`${label}: name is required.`);
    const price = toMoney(p.price);
    if (!(price > 0)) errors.push(`${label}: price must be more than 0.`);
    plan.price = price || 0;
    plan.billing = PLAN_BILLING.includes(p.billing) ? p.billing : 'yearly';
    if (plan.billing === 'custom_days') {
      const d = Number.parseInt(p.customDays, 10);
      if (!(d >= 1 && d <= 3650)) errors.push(`${label}: number of days must be 1–3650.`);
      plan.customDays = d || 30;
    }
    const md = p.maxDevices === '' || p.maxDevices === undefined ? 1 : Number.parseInt(p.maxDevices, 10);
    if (!(md >= 1 && md <= 1000)) errors.push(`${label}: devices must be 1–1000.`);
    plan.maxDevices = md || 1;
    plan.features = toList(p.features, { maxItems: 20, maxLen: 160 });
    plan.isActive = p.isActive === undefined ? true : bool(p.isActive);
    plan.order = i;
    gstInput(p, errors, plan, label, { allowInherit: true });
    return plan;
  });
};

const toPackages = (value, errors) => {
  const arr = Array.isArray(value) ? value.slice(0, 8) : [];
  return arr.map((raw, i) => {
    const p = raw || {};
    const label = `Package ${i + 1}`;
    const pkg = { name: str(p.name, 60) };
    const id = idOrNew(p._id);
    if (id) pkg._id = id;
    if (!pkg.name) errors.push(`${label}: name is required.`);
    const price = toMoney(p.price);
    if (!(price > 0)) errors.push(`${label}: price must be more than 0.`);
    pkg.price = price || 0;
    const dp = toMoney(p.discountedPrice);
    if (dp === null) errors.push(`${label}: offer price must be a positive number.`);
    else if (dp !== undefined && dp > 0 && dp >= pkg.price) errors.push(`${label}: offer price must be lower than the price.`);
    else pkg.discountedPrice = dp || undefined;
    pkg.deliverables = toList(p.deliverables, { maxItems: 20, maxLen: 200 });
    pkg.deliveryTime = str(p.deliveryTime, 60);
    pkg.isActive = p.isActive === undefined ? true : bool(p.isActive);
    pkg.order = i;
    gstInput(p, errors, pkg, label, { allowInherit: true });
    return pkg;
  });
};

export const APP_ID_RE = /^[a-z0-9][a-z0-9._-]{1,79}$/;

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

  // Licensing: plans, free trial, app id, GST
  if (has(body, 'licensingEnabled')) data.licensingEnabled = bool(body.licensingEnabled);
  if (has(body, 'plans')) data.plans = toPlans(body.plans, errors);
  if (has(body, 'trialEnabled')) data.trialEnabled = bool(body.trialEnabled);
  if (has(body, 'trialDays')) {
    const d = Number.parseInt(body.trialDays, 10);
    if (!(d >= 1 && d <= 90)) errors.push('Trial days must be between 1 and 90.');
    else data.trialDays = d;
  }
  if (has(body, 'trialDownloadUrl')) {
    const u = cleanUrl(body.trialDownloadUrl, { allowRelative: false });
    if (u === null) errors.push('Trial download link must start with https://');
    else data.trialDownloadUrl = u;
  }
  if (has(body, 'trialUsesPackage')) data.trialUsesPackage = bool(body.trialUsesPackage);
  if (has(body, 'allowFreeDownload')) data.allowFreeDownload = bool(body.allowFreeDownload);
  if (has(body, 'trialInstructions')) data.trialInstructions = str(body.trialInstructions, 2000);
  if (has(body, 'appId')) {
    const a = str(body.appId, 80).toLowerCase();
    if (a && !APP_ID_RE.test(a)) errors.push('App ID may only use lowercase letters, numbers, dot, dash and underscore.');
    else if (a) data.appId = a;
  }
  gstInput(body, errors, data);
  if (data.licensingEnabled && has(body, 'plans') && !data.plans.some((p) => p.isActive) && !data.trialEnabled) {
    errors.push('Online licensing needs at least one active plan or the free trial.');
  }

  const pt = data.pricingType;
  if (pt && pt !== 'quote' && !partial && !(data.price > 0) && !(data.licensingEnabled && data.plans?.length)) {
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
  if (has(input, 'purchaseMode')) {
    if (!SERVICE_PURCHASE_MODES.includes(input.purchaseMode)) errors.push('Invalid way of selling (fixed / quote / both).');
    else data.purchaseMode = input.purchaseMode;
  }
  if (has(input, 'packages')) data.packages = toPackages(input.packages, errors);
  gstInput(input, errors, data);
  const mode = data.purchaseMode;
  if (mode && mode !== 'quote' && has(input, 'packages')) {
    const activePk = (data.packages || []).filter((p) => p.isActive);
    if (mode === 'both' && !activePk.length) errors.push('"Fixed packages + quote" needs at least one active package.');
    if (mode === 'fixed' && !activePk.length && (has(input, 'startingPrice') || !partial) && !(data.startingPrice > 0)) errors.push('"Fixed price" needs a price or at least one package.');
  }
  const pt = data.pricingType;
  if (pt && pt !== 'quote' && !partial && !(data.startingPrice > 0) && !(mode && mode !== 'quote' && data.packages?.length)) {
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
const r2 = (n) => Math.round(n * 100) / 100;
const sortByOrder = (a, b) => (a.order || 0) - (b.order || 0);

/** Adds what the buyer will actually pay (GST-exclusive prices get GST added). */
const withPayable = (price, layers, gstConfig) => {
  const tax = taxSettingsFor(layers, gstConfig || {});
  const payable = tax.inclusive ? price : r2(price * (1 + tax.rate / 100));
  return { payable, gstRate: tax.rate, gstInclusive: tax.inclusive };
};

export const publicSoftware = (doc, gstConfig = null) => {
  const s = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  const hasPackage = Boolean(s.fileName || s.downloadUrl);
  delete s.downloadUrl;
  delete s.filePath;
  delete s.fileName;
  delete s.__v;
  s.plans = (s.plans || []).filter((p) => p.isActive).sort(sortByOrder).map((p) => ({
    _id: p._id, name: p.name, price: p.price, billing: p.billing, customDays: p.customDays, maxDevices: p.maxDevices,
    features: p.features || [], ...withPayable(p.price, [p, s], gstConfig),
  }));
  s.hasTrialDownload = Boolean(s.trialEnabled && (s.trialDownloadUrl || (s.trialUsesPackage && hasPackage)));
  if (!s.licensingEnabled) { s.plans = []; s.hasTrialDownload = false; }
  s.fromPrice = s.plans.length ? Math.min(...s.plans.map((p) => p.payable)) : null;
  // Single-price software (no plans): "Buy now" opens the one-page checkout for one standard licence.
  const list = Number(s.price) || 0;
  const disc = Number(s.discountedPrice) || 0;
  const main = s.pricingType === 'quote' ? 0 : (disc > 0 && disc < list ? disc : list);
  s.mainOffer = !s.plans.length && main > 0
    ? { price: main, originalPrice: main < list ? list : null, billing: s.pricingType === 'subscription_monthly' ? 'monthly' : s.pricingType === 'subscription_yearly' ? 'yearly' : 'lifetime', maxDevices: 1, ...withPayable(main, [s], gstConfig) }
    : null;
  s.buyable = Boolean(s.plans.length || s.mainOffer);
  return s;
};

export const publicService = (doc, gstConfig = null) => {
  const s = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
  delete s.enquiryCount;
  delete s.__v;
  const mode = s.purchaseMode || 'quote';
  s.packages = mode === 'quote' ? [] : (s.packages || []).filter((p) => p.isActive).sort(sortByOrder).map((p) => {
    const price = (p.discountedPrice > 0 && p.discountedPrice < p.price) ? p.discountedPrice : p.price;
    return {
      _id: p._id, name: p.name, price, originalPrice: price < p.price ? p.price : null, deliverables: p.deliverables || [],
      deliveryTime: p.deliveryTime || '', ...withPayable(price, [p, s], gstConfig),
    };
  });
  s.purchaseMode = mode;
  // A "fixed" service without packages is sold at its own price
  if (mode !== 'quote' && !s.packages.length) {
    const p = Number(s.startingPrice) || 0;
    const d = Number(s.discountedPrice);
    const price = (d > 0 && d < p) ? d : p;
    s.mainOffer = price > 0 ? { price, originalPrice: price < p ? p : null, ...withPayable(price, [s], gstConfig) } : null;
  }
  const offers = [...s.packages.map((p) => p.payable), ...(s.mainOffer ? [s.mainOffer.payable] : [])];
  s.fromPrice = offers.length ? Math.min(...offers) : null;
  s.canBuy = mode !== 'quote' && offers.length > 0;
  s.canQuote = mode !== 'fixed';
  return s;
};

/** Public ordering: explicit order (asc), then featured, then newest. */
export const CATALOG_SORT = { order: 1, isFeatured: -1, createdAt: -1 };
