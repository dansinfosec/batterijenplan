import { useEffect, useState } from "react";

// Simpele data-fetch hook: { data, loading, error }
// `enabled: false` stelt de fetch uit (loading blijft true) — handig om
// below-the-fold data pas na de first paint te laden.
export default function useFetch(fn, deps = [], enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { data, loading, error };
}
