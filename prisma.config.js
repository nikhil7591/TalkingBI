const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }

    const idx = line.indexOf("=");
    const rawKey = line.slice(0, idx).trim();
    const key = rawKey.startsWith("export ") ? rawKey.slice(7).trim() : rawKey;
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (key) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, "frontend", ".env"));
loadEnvFile(path.join(cwd, "frontend", ".env.local"));

module.exports = {
  schema: "frontend/prisma/schema.prisma",
  migrations: {
    path: "frontend/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
