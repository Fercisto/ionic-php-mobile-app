import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(scriptDirectory);
const envFile = path.join(projectDirectory, '.env');
const environmentDirectory = path.join(projectDirectory, 'src', 'environments');

const envContents = await readFile(envFile, 'utf8');
const apiUrlMatch = envContents.match(/^API_URL\s*=\s*(.*)\s*$/m);
const apiUrl = apiUrlMatch?.[1]?.replace(/^['"]|['"]$/g, '');

if (!apiUrl) {
  throw new Error(`API_URL no está definido en ${envFile}`);
}

const createEnvironmentFile = (production) => `export const environment = {
  production: ${production},
  apiUrl: '${apiUrl.replaceAll("'", "\\'")}'
};
`;

await writeFile(
  path.join(environmentDirectory, 'environment.ts'),
  createEnvironmentFile(false),
  'utf8'
);
await writeFile(
  path.join(environmentDirectory, 'environment.prod.ts'),
  createEnvironmentFile(true),
  'utf8'
);

console.log(`Environments generados con API_URL=${apiUrl}`);
