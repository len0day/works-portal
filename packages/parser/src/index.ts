import { parseProject } from './normalizer';
import { commitDraft } from './commit';

export { parseProject } from './normalizer';
export type { NormalizeOptions } from './normalizer';
export { walkFiles } from './fs-walker';
export * from './markdown';
export { ADAPTERS, getAdapter } from './adapters/index';
export { commitDraft } from './commit';

// CLI 入口（仅当直接执行时）
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法: pnpm parse <path> [--code=X] [--dry] [--commit]');
    process.exit(1);
  }
  const path = args[0];
  const codeArg = args.find((a) => a.startsWith('--code='))?.slice('--code='.length);
  const dry = args.includes('--dry');
  const commit = args.includes('--commit');

  const draft = await parseProject(path, codeArg);

  const summary = {
    project: draft.project.display_name ?? draft.project.code,
    code: draft.project.code,
    version: draft.project.current_version,
    features: draft.features.length,
    highlights: draft.highlights.length,
    releases: draft.releases.length,
    warnings: draft.warnings,
  };
  console.error(JSON.stringify(summary, null, 2));

  if (dry) {
    console.log(JSON.stringify(draft, null, 2));
    return;
  }

  if (commit) {
    const result = await commitDraft(draft);
    console.error('commit:', JSON.stringify(result, null, 2));
    return;
  }

  // 默认只打印 summary（不打印完整 draft，避免噪音）
  console.log(JSON.stringify(summary, null, 2));
}

// 直接执行（tsx src/index.ts）时跑 CLI；被 import 时不跑。
import { fileURLToPath } from 'node:url';
const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
