import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [
    solidStart({ middleware: "src/middleware/index.ts" }),
    nitro({
      preset: process.env.VERCEL === "1" ? "vercel" : "node-server",
      plugins: ["src/server/plugins/request-logger.ts"],
    }),
  ],
});
