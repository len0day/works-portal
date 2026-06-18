'use client';

import dynamic from 'next/dynamic';

// md-editor 是 ESM client-only 组件，SSR 会失败，dynamic ssr:false 包装
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <div className="rounded-md border p-3 text-xs text-muted-foreground">加载编辑器…</div>,
});

interface Props {
  value: string;
  onChange: (v: string) => void;
  height?: number;
  preview?: 'edit' | 'live' | 'preview';
}

export function MarkdownEditor({ value, onChange, height = 240, preview = 'live' }: Props) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        height={height}
        preview={preview}
        onChange={(v) => onChange(v ?? '')}
      />
    </div>
  );
}

export function MarkdownPreview({ value }: { value: string }) {
  const MDPreview = dynamic(() => import('@uiw/react-md-editor').then((m) => m.default.Markdown), {
    ssr: false,
  });
  return (
    <div data-color-mode="light" className="prose prose-sm max-w-none">
      <MDPreview source={value} />
    </div>
  );
}
