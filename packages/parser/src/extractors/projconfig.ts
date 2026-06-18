import { readFileSync } from 'node:fs';
import type { FoundFile } from '../fs-walker';

export interface ProjConfigOut {
  appid?: string;
  projectname?: string;
  description?: string;
}

/** 读小程序 project.config.json。 */
export function extractProjConfig(files: FoundFile[]): ProjConfigOut {
  const f = files.find((x) => x.name === 'project.config.json' && x.rel === 'project.config.json');
  if (!f) return {};
  try {
    const data = JSON.parse(readFileSync(f.path, 'utf8'));
    return {
      appid: typeof data.appid === 'string' ? data.appid : undefined,
      projectname: typeof data.projectname === 'string' ? data.projectname : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
    };
  } catch {
    return {};
  }
}
