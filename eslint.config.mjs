import next from "eslint-config-next/core-web-vitals";

/**
 * Flat config. Next 16 removed `next lint`, and eslint-config-next v16 ships
 * flat config only, so the old .eslintrc.json no longer resolves.
 */
export default [
  { ignores: [".next/**", "node_modules/**", "supabase/**"] },
  ...(Array.isArray(next) ? next : [next]),
  {
    rules: {
      // New in eslint-config-next v16, and it fires on pre-existing patterns —
      // reading a Supabase session or localStorage in an effect and setting
      // state from the result. Each is a real refactor toward `use` or a server
      // read, and doing eight of them inside a framework upgrade would make any
      // resulting regression unattributable. Warn now, fix as its own change.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
