import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    nitro({ preset: "bun" }),
    tanstackStart(),
    viteReact({}),
  ],
  resolve: { tsconfigPaths: true },
  build: { rolldownOptions: { external: ["bun"] } },
  server: { allowedHosts: true },
});

export default config;
