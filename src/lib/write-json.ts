import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

/** Serializes data the way `prettier --write` would leave the file. */
export async function formatJson(
  file: string | URL,
  data: unknown,
): Promise<string> {
  const filepath = file instanceof URL ? fileURLToPath(file) : file;
  const options = await resolveConfig(filepath);

  return format(JSON.stringify(data, null, 2), { ...options, filepath });
}

/** Writes data as JSON formatted with the project's Prettier config. */
export async function writeJson(
  file: string | URL,
  data: unknown,
): Promise<void> {
  writeFileSync(file, await formatJson(file, data));
}
