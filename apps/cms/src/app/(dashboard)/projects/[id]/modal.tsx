'use client';

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
