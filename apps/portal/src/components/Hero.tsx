import { motion } from 'motion/react';

export const Hero = () => (
  <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-6">
    <div className="relative z-10 max-w-6xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-8">
          开发者
          <br />
          <span className="text-white/40">作品门户</span>
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
          小程序 · 全栈应用 · 开发工具
          <br />
          介绍 / 技术亮点 / 版本更新
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <a
            href="/works"
            className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-sm font-mono uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300"
          >
            浏览全部作品
          </a>
        </motion.div>
      </motion.div>
    </div>

    {/* Ambient background */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-2 text-white/20"
      >
        <span className="text-xs font-mono uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </motion.div>
    </div>
  </section>
);
