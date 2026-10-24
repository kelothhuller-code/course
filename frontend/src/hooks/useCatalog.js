import { useEffect, useState } from 'react';
import { api } from '../api';

// One shared request per page load for the enquiry form definition + software/service catalog.
let formPromise = null;
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
