import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CarouselNodeView from '../CarouselNodeView';

export interface CarouselOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    carousel: {
      setCarousel: (options: { carouselId: string; carouselType: string; title?: string }) => ReturnType;
    };
  }
}

export const Carousel = Node.create<CarouselOptions>({
  name: 'carousel',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      carouselId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-carousel-id'),
        renderHTML: (attributes) => {
          if (!attributes.carouselId) {
            return {};
          }
          return {
            'data-carousel-id': attributes.carouselId,
          };
        },
      },
      carouselType: {
        default: 'hero',
        parseHTML: (element) => element.getAttribute('data-carousel-type'),
        renderHTML: (attributes) => {
          if (!attributes.carouselType) {
            return {};
          }
          return {
            'data-carousel-type': attributes.carouselType,
          };
        },
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-carousel-title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {};
          }
          return {
            'data-carousel-title': attributes.title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-carousel]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-carousel': '' })];
  },

  addCommands() {
    return {
      setCarousel:
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
    return ReactNodeViewRenderer(CarouselNodeView);
  },
});

export default Carousel;