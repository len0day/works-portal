import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Github, ExternalLink } from 'lucide-react';

interface Highlight {
  id: string;
  project_id: string;
  title: string;
  metric_label?: string | null;
  metric_value?: string | null;
  sort_order: number;
}

interface Project {
  id: string;
  slug: string;
  display_name: string;
  tagline?: string | null;
  cover_url?: string | null;
  current_version?: string | null;
  tech_stack?: string[] | null;
  repo_url?: string | null;
  homepage_url?: string | null;
}

interface Props {
  projects: Project[];
  highlights: Highlight[];
}

const ProjectCard = ({
  project, index, highlights,
}: { project: Project; index: number; highlights: Highlight[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const isEven = index % 2 === 0;

  const topHighlights = highlights
    .filter((h) => h.project_id === project.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3);

  return (
    <motion.div
      ref={ref}
      style={{ y: isEven ? 0 : y }}
      className={`group cursor-pointer relative ${ !isEven ? 'md:mt-32' : '' }`}
    >
      <a href={`/projects/${project.slug}`}>
        <div className="relative overflow-hidden rounded-sm aspect-[4/3] mb-8 bg-neutral-900">
          {project.cover_url && (
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
              src={project.cover_url}
              alt={project.display_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-2xl font-medium tracking-tight mb-3 group-hover:text-neutral-300 transition-colors">
              {project.display_name}
            </h3>
            {project.tagline && (
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">{project.tagline}</p>
            )}
            {project.tech_stack && project.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tech_stack.slice(0, 4).map((tech, i) => (
                  <span key={i} className="px-2 py-1 text-xs font-mono bg-neutral-900 text-neutral-400 rounded border border-white/5">{tech}</span>
                ))}
              </div>
            )}
            {topHighlights.length > 0 && (
              <div className="flex gap-6 mt-4">
                {topHighlights.map((h) => (
                  <div key={h.id}>
                    {h.metric_value && <div className="text-lg font-bold font-mono text-white">{h.metric_value}</div>}
                    <div className="text-xs text-neutral-600 mt-0.5">{h.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-1 shrink-0">
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-neutral-500 hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            )}
            {project.homepage_url && (
              <a href={project.homepage_url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-neutral-500 hover:text-white transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </a>
    </motion.div>
  );
};

export const FeaturedProjects = ({ projects, highlights }: Props) => {
  const featured = projects.slice(0, 4);

  return (
    <section id="work" className="py-32 px-6 bg-neutral-950">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8"
        >
          <div>
            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-baseline gap-3">
                <span className="font-serif italic text-lg text-white">01</span>
                <span className="text-xs font-mono uppercase tracking-[0.3em] text-neutral-400">精选作品</span>
              </div>
              <div className="h-px w-32 bg-gradient-to-r from-white/30 to-transparent" />
            </div>
            <h2 className="text-5xl md:text-8xl font-medium tracking-tighter leading-[0.9]">
              我做的 <br />
              <span className="italic font-serif text-neutral-500">产品</span>
            </h2>
          </div>
          <div className="hidden md:block mb-2">
            <a href="/works" className="text-xs font-mono uppercase tracking-widest border-b border-white/30 pb-2 hover:text-neutral-300 transition-colors inline-block">
              查看全部项目
            </a>
          </div>
        </motion.div>

        {featured.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 p-12 text-center text-sm text-neutral-600">
            尚未发布任何作品。请到后台 CMS 录入并发布。
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 md:gap-y-32">
            {featured.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} highlights={highlights} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
