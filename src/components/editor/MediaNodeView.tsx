'use client';

import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

export default function MediaNodeView({ node, deleteNode }: NodeViewProps) {
  const { url, filename, mimeType } = node.attrs;
  const isImage = mimeType?.startsWith('image/');
  const isVideo = mimeType?.startsWith('video/');

  return (
    <NodeViewWrapper className="my-4">
      <div className="relative rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-4">
        <button
          type="button"
          onClick={deleteNode}
          className="absolute right-2 top-2 rounded bg-red-100 px-2 py-1 text-xs text-red-600 hover:bg-red-200"
        >
          Remove
        </button>
        <div className="flex items-center gap-3">
          {isImage && url ? (
            <img src={url} alt={filename} className="h-16 w-16 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-green-100">
              {isVideo ? (
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
          )}
          <div>
            <p className="font-semibold text-green-800">{filename || 'Media File'}</p>
            <p className="text-xs text-green-500">{mimeType}</p>
            <p className="text-xs text-green-500">This media will be rendered on the public page</p>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}