'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CarouselItemData {
  id: string;
  title?: string;
  imageOrIconUrl: string;
}

interface GenericCarouselProps {
  title?: string;
  type: 'hero' | 'client' | 'employee' | 'recommendation';
  items: CarouselItemData[];
  autoPlayInterval?: number;
}

/**
 * GenericCarousel - A highly reusable slider component.
 * Renders hero banners, client logos, employee cards, and recommendations.
 * Uses pure CSS transitions with React state management (no external dependencies).
 */
export default function GenericCarousel({
  title,
  type,
  items,
  autoPlayInterval = 5000,
}: GenericCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [items.length, isPaused, autoPlayInterval, goToNext]);

  if (items.length === 0) {
    return null;
  }

  // Hero type: Full-width image carousel with overlay text
  if (type === 'hero') {
    return (
      <section
        className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label={title || 'Hero carousel'}
      >
        {/* Slides */}
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item) => (
            <div key={item.id} className="relative w-full h-full flex-shrink-0">
              <img
                src={item.imageOrIconUrl}
                alt={item.title || 'Hero image'}
                className="w-full h-full object-cover"
              />
              {item.title && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center px-4">
                    {item.title}
                  </h2>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-lg transition-colors"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-lg transition-colors"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  // Client type: Logo scroller (horizontal scroll)
  if (type === 'client') {
    return (
      <section className="py-12 bg-gray-50" aria-label={title || 'Client logos'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {title && (
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
              {title}
            </h2>
          )}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out items-center"
              style={{ transform: `translateX(-${currentIndex * (100 / 4)}%)` }}
            >
              {items.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-1/2 md:w-1/4 px-4">
                  <div className="flex items-center justify-center h-24 bg-white rounded-lg shadow-sm p-4">
                    <img
                      src={item.imageOrIconUrl}
                      alt={item.title || 'Client logo'}
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {items.length > 4 && (
            <div className="flex justify-center gap-2 mt-6">
              {items.slice(0, Math.ceil(items.length / 4)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to group ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Employee and Recommendation types: Card carousel
  return (
    <section className="py-12" aria-label={title || 'Carousel'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
            {title}
          </h2>
        )}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {items.map((item) => (
              <div key={item.id} className="w-full flex-shrink-0 px-2">
                <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                  <img
                    src={item.imageOrIconUrl}
                    alt={item.title || 'Carousel item'}
                    className="w-full h-64 object-cover"
                  />
                  {item.title && (
                    <div className="p-4 text-center">
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-800 hover:bg-gray-50 transition-colors"
                aria-label="Previous item"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-800 hover:bg-gray-50 transition-colors"
                aria-label="Next item"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to item ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}