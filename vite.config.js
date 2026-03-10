import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as wasmPlugin from 'vite-plugin-wasm';
import * as topLevelAwaitPlugin from 'vite-plugin-top-level-await';
const wasm = wasmPlugin.default || wasmPlugin;
const topLevelAwait = topLevelAwaitPlugin.default || topLevelAwaitPlugin;
export default defineConfig({
    plugins: [
        react(),
        wasm(),
        topLevelAwait()
    ],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    }
});
//# sourceMappingURL=vite.config.js.map