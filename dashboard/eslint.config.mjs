import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// cc-0013 Stage B — minimal ESLint flat config wrapping the Next 15 preset.
// Future stages may add custom rules (e.g. enforcement that lib/supabase/server.ts
// is the only module touching SUPABASE_SERVICE_ROLE_KEY); v1 relies on the
// Next preset + `server-only` runtime guard + V3/V4/V5 grep gates in CI.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
