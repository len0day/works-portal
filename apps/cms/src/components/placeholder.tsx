export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-lg border border-dashed bg-muted/20 p-12 text-center">
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
