import { useCallback, useEffect, useRef, useState } from 'react';

/* Formatting helpers and the data-loading hook for the account area (/dashboard/*). */

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', opts);
};
export const fmtDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Days left until a date: positive = days remaining, 0 = today, negative = days ago. */
export const daysUntil = (d) => {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

/** Loads data on mount (and on reload()). Keeps the last good data while reloading. */
export function useAsync(loader) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const alive = useRef(true);
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (alive.current) setState({ loading: false, error: null, data });
    } catch (error) {
      if (alive.current) setState((s) => ({ loading: false, error, data: s.data }));
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    // First load: state already starts as loading, so only settle it when the request finishes.
    Promise.resolve()
      .then(() => loaderRef.current())
      .then(
        (data) => { if (alive.current) setState({ loading: false, error: null, data }); },
        (error) => { if (alive.current) setState((s) => ({ loading: false, error, data: s.data })); },
      );
    return () => { alive.current = false; };
  }, []);
  return { ...state, reload: run };
}
