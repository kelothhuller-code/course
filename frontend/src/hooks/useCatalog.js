import { useEffect, useState } from 'react';
import { api } from '../api';

// One shared request per page load for the enquiry form definition + software/service catalog.
let formPromise = null;

/**
 * Let a page that already fetches the form (the homepage, via GET /api/home) hand it over so
 * the form doesn't make its own request. `promise` resolves to the form data or null/undefined,
 * in which case we fall back to GET /api/leads/enquiry-form.
 */
export const primeEnquiryForm = (promise) => {
  if (formPromise) return;
  formPromise = Promise.resolve(promise)
    .then((data) => data || api.getEnquiryForm())
    .catch(() => api.getEnquiryForm())
    .catch((err) => {
      formPromise = null;
      throw err;
    });
};

export const loadEnquiryForm = () => {
  if (!formPromise) {
    formPromise = api.getEnquiryForm().catch((err) => {
      formPromise = null;
      throw err;
    });
  }
  return formPromise;
};

/** { categories, catalog: { software: [], service: [] }, loading, error } */
export function useEnquiryForm() {
  const [state, setState] = useState({ categories: [], catalog: { software: [], service: [] }, loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    loadEnquiryForm()
      .then((d) => alive && setState({
        categories: Array.isArray(d?.categories) ? d.categories : [],
        catalog: { software: d?.catalog?.software || [], service: d?.catalog?.service || [] },
        loading: false,
        error: '',
      }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message || 'Could not load the form.' })));
    return () => { alive = false; };
  }, []);
  return state;
}
