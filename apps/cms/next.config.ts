import type { NextConfig } from 'next';

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// monorepo 根目录（works-portal）— standalone 输出从这里开始追踪文件依赖
const repoRoot = resolve(__dirname, '../..');

const config: NextConfig = {
  output: 'standalone',
  // 消除 "outputFileTracingRoot" 警告：monorepo 下显式指向工作区根
  outputFileTracingRoot: repoRoot,
  // monorepo 内部包是 TS 源码，需转译
  transpilePackages: ['@works/db', '@works/shared', '@works/parser', '@uiw/react-md-editor'],
  experimental: {
    // 允许 Next 跟随工作区符号链接到 packages/*
    esmExternals: true,
  },
};

export default config;
