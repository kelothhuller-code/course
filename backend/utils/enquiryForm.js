import EnquiryCategory, { QUESTION_TYPES } from '../models/EnquiryCategory.js';
import Software from '../models/Software.js';
import Service from '../models/Service.js';
import { DEFAULT_ENQUIRY_CATEGORIES, priorityForScore } from './enquiryDefaults.js';
import { slugify } from './catalog.js';

/** Copy the default categories into the DB the first time (never overwrites edits). */
export const ensureEnquiryCategories = async () => {
  const count = await EnquiryCategory.estimatedDocumentCount();
  if (count === 0) {
    try {
      await EnquiryCategory.insertMany(DEFAULT_ENQUIRY_CATEGORIES, { ordered: false });
    } catch (err) {
      if (err?.code !== 11000) throw err; // concurrent first request — ignore duplicates
    }
  }
};

/** Software + service names used by "catalog" questions (only publicly visible items). */
export const getCatalogOptions = async () => {
  const [software, services] = await Promise.all([
    Software.find({ status: 'active' }).sort({ order: 1, createdAt: -1 }).select('title slug').lean(),
    Service.find({ status: 'active' }).sort({ order: 1, createdAt: -1 }).select('title slug').lean(),
  ]);
  const map = (type) => (d) => ({ id: String(d._id), slug: d.slug || '', title: d.title, type });
  return { software: software.map(map('software')), service: services.map(map('service')) };
};

export const getPublicEnquiryForm = async () => {
  await ensureEnquiryCategories();
  const [cats, catalog] = await Promise.all([
    EnquiryCategory.find({ isActive: true }).sort({ order: 1, label: 1 }).lean(),
    getCatalogOptions(),
  ]);
  return {
    categories: cats.map((c) => ({
      key: c.key,
      label: c.label,
      description: c.description,
      icon: c.icon,
      questions: [...(c.questions || [])]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        // Scores are internal triage hints; never expose them publicly
        .map(({ options, ...rest }) => ({ ...rest, options: (options || []).map((op) => op.label) })),
    })),
    catalog,
  };
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Validate answers against the stored question definitions.
 * Returns { answers, score, priority, related } or { error }.
 */
export const validateAnswers = async (category, rawAnswers = {}) => {
  const answers = [];
  let score = 0;
  let related = null;
  const catalog = (category.questions || []).some((q) => q.type === 'catalog') ? await getCatalogOptions() : null;
  const input = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers) ? rawAnswers : {};

  for (const q of [...(category.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const raw = input[q.key];
    let value = '';
    const optionLabels = (q.options || []).map((op) => op.label);

    switch (q.type) {
      case 'select': {
        const v = str(raw, 200);
        if (v && !optionLabels.includes(v)) return { error: `Please choose a valid option for “${q.label}”.` };
        value = v;
        if (v) score += q.options.find((op) => op.label === v)?.score || 0;
        break;
      }
      case 'multiselect': {
        const arr = (Array.isArray(raw) ? raw : []).map((x) => str(x, 200)).filter(Boolean);
        if (arr.some((v) => !optionLabels.includes(v))) return { error: `Please choose valid options for “${q.label}”.` };
        const uniq = [...new Set(arr)];
        value = uniq.join(', ');
        score += uniq.reduce((s, v) => s + (q.options.find((op) => op.label === v)?.score || 0), 0);
        break;
      }
      case 'number':
      case 'range': {
        if (raw === '' || raw === null || raw === undefined) break;
        const n = Number(raw);
        if (!Number.isFinite(n)) return { error: `“${q.label}” must be a number.` };
        if (q.min !== null && q.min !== undefined && n < q.min) return { error: `“${q.label}” must be at least ${q.min}.` };
        if (q.max !== null && q.max !== undefined && n > q.max) return { error: `“${q.label}” must be at most ${q.max}.` };
        value = `${n}${q.unit ? ` ${q.unit}` : ''}`;
        break;
      }
      case 'catalog': {
        const v = str(raw, 40);
        if (v && v !== 'not_sure') {
          const pool = q.catalogSource === 'service' ? catalog.service
            : q.catalogSource === 'software' ? catalog.software
              : [...catalog.software, ...catalog.service];
          const hit = pool.find((p) => p.id === v);
          if (!hit) return { error: `Please choose a valid option for “${q.label}”.` };
          value = hit.title;
          related = { type: hit.type, id: hit.id, title: hit.title };
        } else if (v === 'not_sure') {
          value = 'Not sure yet';
        }
        break;
      }
      case 'textarea':
        value = str(raw, 3000);
        break;
      default:
        value = str(raw, 300);
    }

    if (q.required && !value) return { error: `Please answer “${q.label}”.` };
    if (value) answers.push({ key: q.key, label: q.label, value });
  }
  return { answers, score, priority: priorityForScore(score), related };
};

/** Normalise an admin-submitted category (questions included). */
export const validateEnquiryCategoryInput = (body = {}) => {
  const errors = [];
  const label = str(body.label, 80);
  if (!label) errors.push('Label is required.');
  const key = slugify(body.key || label).replace(/-/g, '_').slice(0, 40);
  if (!key) errors.push('Key is required.');
  const questions = (Array.isArray(body.questions) ? body.questions : []).slice(0, 25).map((q, i) => {
    const qLabel = str(q?.label, 160);
    const type = QUESTION_TYPES.includes(q?.type) ? q.type : 'text';
    const options = (Array.isArray(q?.options) ? q.options : [])
      .map((op) => (typeof op === 'string' ? { label: str(op, 120), score: 0 } : { label: str(op?.label, 120), score: Math.max(0, Math.min(10, Number(op?.score) || 0)) }))
      .filter((op) => op.label)
      .slice(0, 30);
    if (!qLabel) errors.push(`Question ${i + 1} needs a label.`);
    if ((type === 'select' || type === 'multiselect') && options.length < 2) errors.push(`Question “${qLabel || i + 1}” needs at least 2 options.`);
    const num = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
    return {
      key: (slugify(q?.key || qLabel).replace(/-/g, '_') || `q${i + 1}`).slice(0, 40),
      label: qLabel,
      type,
      options: type === 'select' || type === 'multiselect' ? options : [],
      catalogSource: type === 'catalog' ? (['software', 'service', 'both'].includes(q?.catalogSource) ? q.catalogSource : 'both') : '',
      required: q?.required === true || q?.required === 'true',
      placeholder: str(q?.placeholder, 160),
      min: num(q?.min), max: num(q?.max), step: num(q?.step),
      unit: str(q?.unit, 30),
      order: i + 1,
    };
  });
  const keys = questions.map((q) => q.key);
  if (new Set(keys).size !== keys.length) errors.push('Each question needs a unique key.');
  const order = Number.parseInt(body.order, 10);
  return errors.length ? { error: errors.join(' ') } : {
    data: {
      key, label,
      description: str(body.description, 200),
      icon: str(body.icon, 30) || 'spark',
      order: Number.isInteger(order) ? order : 0,
      isActive: body.isActive !== false && body.isActive !== 'false',
      questions,
    },
  };
};
