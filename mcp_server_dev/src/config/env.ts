import dotenv from "dotenv";

dotenv.config();

const required = ["GM_BASE_URL", "GM_LOGIN_ID", "GM_PASSWORD"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  gmBaseUrl: process.env.GM_BASE_URL!,
  gmLoginId: process.env.GM_LOGIN_ID!,
  gmPassword: process.env.GM_PASSWORD!,
};
