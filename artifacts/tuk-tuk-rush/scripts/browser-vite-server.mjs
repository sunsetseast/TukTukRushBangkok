import {createServer} from 'vite';
import os from 'node:os';
import path from 'node:path';
// Isolate dependency optimization across simultaneous baseline/final servers.
// A shared node_modules cache can otherwise trigger a mid-capture full reload.
const port=Number(process.argv[2]);
// Evidence capture must not reload when a separate QA report or script is
// written. Source changes require a fresh capture process, never live HMR.
const server=await createServer({cacheDir:path.join(os.tmpdir(),`tuktuk-qa-vite-${port}`),server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:{ignored:['**/scripts/**']}}});
await server.listen();
