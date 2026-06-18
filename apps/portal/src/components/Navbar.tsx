import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: '作品', href: '/works' },
    { name: '关于', href: '/about' },
    { name: '服务', href: '/#services' },
    { name: '联系', href: '/#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-neutral-950/80 backdrop-blur-md py-4 border-b border-white/5'
          : 'py-8 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <a href="/" className="text-2xl font-bold tracking-tighter">
            DEV.PORTAL
          </a>
        </motion.div>

        {/* Desktop */}
        <div className="hidden md:flex gap-8">
          {navItems.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <a
                href={item.href}
                className="text-sm uppercase tracking-widest hover:text-white/70 transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden z-50 text-white"
        >
          {isOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'tween', duration: 0.4 }}
              className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-12 md:hidden"
            >
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-4xl font-medium tracking-tight hover:text-neutral-500 transition-colors"
                >
                  {item.name}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};
