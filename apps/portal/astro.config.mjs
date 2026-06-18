import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// 门户：静态站点，构建时从 DB 拉取已发布内容
export default defineConfig({
  site: 'https://portal.aiedutalk.online',
  output: 'static',
  integrations: [tailwind({ applyBaseStyles: false }), sitemap()],
});
