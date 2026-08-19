'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import Carousel from './extensions/carousel-extension';
import MediaEmbed from './extensions/media-extension';

interface CarouselItem {
  _id: string;
  title: string;
  type: string;
}

interface MediaItem {
  _id: string;
  filename: string;
  url: string;
  mimeType: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingCarousels, setLoadingCarousels] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your content here...',
      }),
      Carousel,
      MediaEmbed,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const fetchCarousels = async () => {
    setLoadingCarousels(true);
    try {
      const res = await fetch('/api/carousels');
      const data = await res.json();
      if (data.success) {
        // Group by type and get unique types
        const grouped = data.data.reduce(
          (acc: Record<string, CarouselItem>, item: CarouselItem & { type: string }) => {
            if (!acc[item.type]) {
              acc[item.type] = { _id: item.type, title: `${item.type} carousel`, type: item.type };
            }
            return acc;
          },
          {}
        );
        setCarousels(Object.values(grouped));
      }
    } catch {
      console.error('Failed to fetch carousels');
    } finally {
      setLoadingCarousels(false);
    }
  };

  const fetchMedia = async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (data.success) {
        setMediaItems(data.data);
      }
    } catch {
      console.error('Failed to fetch media');
    } finally {
      setLoadingMedia(false);
    }
  };

  const openCarouselModal = () => {
    fetchCarousels();
    setShowCarouselModal(true);
  };

  const openMediaModal = () => {
    fetchMedia();
    setShowMediaModal(true);
  };

  const insertCarousel = (carousel: CarouselItem) => {
    editor?.chain().focus().setCarousel({
      carouselId: carousel._id,
      carouselType: carousel.type,
      title: carousel.title,
    }).run();
    setShowCarouselModal(false);
  };

  const insertMedia = (media: MediaItem) => {
    editor?.chain().focus().setMediaEmbed({
      mediaId: media._id,
      url: media.url,
      filename: media.filename,
      mimeType: media.mimeType,
    }).run();
    setShowMediaModal(false);
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) {
    return (
      <div className="rounded-md border border-gray-300 bg-white p-4">
        <div className="h-[300px] animate-pulse bg-gray-100" />
      </div>
    );
  }

  const toolbarButtonClass = 'rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  const activeButtonClass = 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700';

  return (
    <div className="rounded-md border border-gray-300 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${toolbarButtonClass} ${editor.isActive('bold') ? activeButtonClass : ''}`}
          title="Bold"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${toolbarButtonClass} ${editor.isActive('italic') ? activeButtonClass : ''}`}
          title="Italic"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 16h4M14 4l-4 16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${toolbarButtonClass} ${editor.isActive('strike') ? activeButtonClass : ''}`}
          title="Strikethrough"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M6 8c0-2 2-4 6-4s6 2 6 4M6 16c0 2 2 4 6 4s6-2 6-4" />
          </svg>
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${toolbarButtonClass} ${editor.isActive('heading', { level: 1 }) ? activeButtonClass : ''}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${toolbarButtonClass} ${editor.isActive('heading', { level: 2 }) ? activeButtonClass : ''}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${toolbarButtonClass} ${editor.isActive('heading', { level: 3 }) ? activeButtonClass : ''}`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${toolbarButtonClass} ${editor.isActive('bulletList') ? activeButtonClass : ''}`}
          title="Bullet List"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${toolbarButtonClass} ${editor.isActive('orderedList') ? activeButtonClass : ''}`}
          title="Ordered List"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1M10 6h11M10 12h11M10 18h11" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${toolbarButtonClass} ${editor.isActive('blockquote') ? activeButtonClass : ''}`}
          title="Blockquote"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

        {/* Link and Image */}
        <button
          type="button"
          onClick={setLink}
          className={`${toolbarButtonClass} ${editor.isActive('link') ? activeButtonClass : ''}`}
          title="Link"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        <button type="button" onClick={addImage} className={toolbarButtonClass} title="Insert Image URL">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

        {/* Insert Carousel */}
        <button
          type="button"
          onClick={openCarouselModal}
          className="flex items-center gap-1 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          title="Insert Carousel"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Carousel
        </button>

        {/* Insert Media */}
        <button
          type="button"
          onClick={openMediaModal}
          className="flex items-center gap-1 rounded bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
          title="Insert Media"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Media
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`${toolbarButtonClass} disabled:opacity-50`}
          title="Undo"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`${toolbarButtonClass} disabled:opacity-50`}
          title="Redo"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Carousel Modal */}
      {showCarouselModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Insert Carousel</h3>
              <button
                type="button"
                onClick={() => setShowCarouselModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {loadingCarousels ? (
              <div className="py-8 text-center text-gray-500">Loading carousels...</div>
            ) : carousels.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No carousels found. Create carousels in the Carousels section first.
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {carousels.map((carousel) => (
                  <button
                    key={carousel._id}
                    type="button"
                    onClick={() => insertCarousel(carousel)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="font-medium capitalize text-gray-900">{carousel.type} Carousel</p>
                    <p className="text-sm text-gray-500">Click to insert this carousel type</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Insert Media</h3>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {loadingMedia ? (
              <div className="py-8 text-center text-gray-500">Loading media...</div>
            ) : mediaItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No media found. Upload media in the Media section first.
              </div>
            ) : (
              <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                {mediaItems.map((media) => (
                  <button
                    key={media._id}
                    type="button"
                    onClick={() => insertMedia(media)}
                    className="group rounded-lg border border-gray-200 p-2 text-left hover:border-green-300 hover:bg-green-50"
                  >
                    {media.mimeType.startsWith('image/') ? (
                      <img src={media.url} alt={media.filename} className="h-20 w-full rounded object-cover" />
                    ) : (
                      <div className="flex h-20 items-center justify-center rounded bg-gray-100">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <p className="mt-1 truncate text-xs text-gray-600">{media.filename}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}