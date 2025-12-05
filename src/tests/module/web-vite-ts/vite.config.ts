import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [
        tsconfigPaths(),
    ],
    server: {
        host: "127.0.0.1",
        port: 3000,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
        hmr: {
            host: "127.0.0.1",
            port: 3001,
        },
    },
    worker: {
        format: "es",
        plugins: () => [tsconfigPaths()],
    },
});
