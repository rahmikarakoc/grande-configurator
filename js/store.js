export function createStore(initial) {
  let state = initial;
  const subscribers = new Set();

  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      if (next === state) return;
      state = next;
      for (const fn of subscribers) {
        try { fn(state); }
        catch (err) { console.error('store abonesi hata verdi:', err); }
      }
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}
