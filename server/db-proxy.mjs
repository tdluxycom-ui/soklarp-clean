export function createDbProxy(getDb) {
  return new Proxy({}, {
    get(_t, prop) {
      return getDb()[prop];
    },
    set(_t, prop, value) {
      getDb()[prop] = value;
      return true;
    }
  });
}
