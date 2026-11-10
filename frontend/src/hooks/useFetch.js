import { useCallback, useEffect, useState } from 'react';

/**
 * Loads data when the page opens (and again when `deps` change).
 *   const { data, loading, error, reload } = useFetch(() => getCustomers({ search }), [search]);
 */
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true; // ignore answers that arrive after the page has changed
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Something went wrong');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { data, loading, error, reload, setData };
}
