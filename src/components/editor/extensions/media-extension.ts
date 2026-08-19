import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MediaNodeView from '../MediaNodeView';

export interface MediaEmbedOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbed: {
      setMediaEmbed: (options: { mediaId: string; url: string; filename: string; mimeType: string }) => ReturnType;
    };
  }
}

export const MediaEmbed = Node.create<MediaEmbedOptions>({
  name: 'mediaEmbed',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) => {
          if (!attributes.mediaId) {
            return {};
          }
          return {
            'data-media-id': attributes.mediaId,
          };
        },
      },
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-url'),
        renderHTML: (attributes) => {
          if (!attributes.url) {
            return {};
          }
          return {
            'data-media-url': attributes.url,
          };
        },
      },
      filename: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-media-filename'),
        renderHTML: (attributes) => {
          if (!attributes.filename) {
            return {};
          }
          return {
            'data-media-filename': attributes.filename,
          };
        },
      },
      mimeType: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-media-mimetype'),
        renderHTML: (attributes) => {
          if (!attributes.mimeType) {
            return {};
          }
          return {
            'data-media-mimetype': attributes.mimeType,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-media-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-media-embed': '' })];
  },

  addCommands() {
    return {
      setMediaEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView);
  },
});

export default MediaEmbed;