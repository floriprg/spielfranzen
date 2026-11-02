import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Lakebase Postgres configuration
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire after 7 days
      return { ttl: "7d" };
    }
    return {};
  },
});

