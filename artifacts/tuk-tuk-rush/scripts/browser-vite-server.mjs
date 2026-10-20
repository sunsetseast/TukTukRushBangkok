import {createServer} from 'vite';
import os from 'node:os';
import path from 'node:path';
// Isolate dependency optimization across simultaneous baseline/final servers.
// A shared node_modules cache can otherwise trigger a mid-capture full reload.
const port=Number(process.argv[2]);
const server=await createServer({cacheDir:path.join(os.tmpdir(),`tuktuk-qa-vite-${port}`),server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();
