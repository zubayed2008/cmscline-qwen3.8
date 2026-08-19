'use client';

import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

const TYPE_LABELS: Record<string, string> = {
  hero: 'Hero Carousel',
  client: 'Client Logos',
  employee: 'Employee Carousel',
  recommendation: 'Recommendations',
};

export default function CarouselNodeView({ node, deleteNode }: NodeViewProps) {
  const { carouselType, title } = node.attrs;

  return (
    <NodeViewWrapper className="my-4">
      <div className="relative rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4">
        <button
          type="button"
          onClick={deleteNode}
          className="absolute right-2 top-2 rounded bg-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-200"
        >
          Remove
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-blue-800">{TYPE_LABELS[carouselType] || 'Carousel'}</p>
            {title && <p className="text-sm text-blue-600">{title}</p>}
            <p className="text-xs text-blue-500">This carousel will be rendered on the public page</p>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}