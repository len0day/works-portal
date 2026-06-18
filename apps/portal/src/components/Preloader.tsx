import { motion, AnimatePresence } from 'motion/react';
import { useState, useLayoutEffect } from 'react';

export const Preloader = () => {
  const [loading, setLoading] = useState(true);

  // 首次访问播放 2s 并打 sessionStorage 标记；本会话内再次进入（整页刷新导航）
  // 在 paint 前立即关闭，避免每次点击都重播动画
  useLayoutEffect(() => {
    if (sessionStorage.getItem('wp_preloaded')) {
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      setLoading(false);
      sessionStorage.setItem('wp_preloaded', '1');
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[999] bg-white flex items-center justify-center text-black"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter">DEV.PORTAL</h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.5, duration: 1.5, ease: 'easeInOut' }}
              className="h-px bg-black/20 w-32"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
