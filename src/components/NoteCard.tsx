import React, { useState } from 'react';
import { Note } from '../types';
import { FileText, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  onBuyNow: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onSelect, onBuyNow }) => {
  const images: string[] = [
    note.cover_image,
    ...(Array.isArray(note.preview_images) ? note.preview_images : []),
  ].filter(Boolean);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<{ [key: number]: boolean }>({});

  const formattedSize = note.pdf_size
    ? note.pdf_size >= 1024 * 1024 * 1024
      ? (note.pdf_size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
      : (note.pdf_size / (1024 * 1024)).toFixed(1) + ' MB'
    : 'PDF Notes';

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 35 && images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    } else if (diff < -35 && images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
    setTouchStartX(null);
  };

  return (
    <div
      id={`note-card-${note.id}`}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
    >
      {/* Image Slider Container - No cropping or cutting, 100% full view */}
      <div 
        onClick={() => onSelect(note)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative h-64 sm:h-72 w-full bg-stone-950 cursor-pointer overflow-hidden border-b border-stone-100 flex items-center justify-center select-none group/slider"
      >
        {images.length > 0 && !imgErrors[currentIndex] ? (
          <>
            {/* Ambient background blur */}
            <img
              src={images[currentIndex]}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110 pointer-events-none"
            />
            {/* Main image: fully contained, zero cropping from any side */}
            <img
              src={images[currentIndex]}
              alt={`${note.title} - Preview ${currentIndex + 1}`}
              referrerPolicy="no-referrer"
              onError={() => setImgErrors((prev) => ({ ...prev, [currentIndex]: true }))}
              className="relative z-1 max-h-full max-w-full object-contain p-2 group-hover:scale-[1.02] transition-transform duration-300"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-stone-300 bg-stone-900 w-full h-full">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-2 shadow-xs">
              <FileText className="w-6 h-6 text-[#5C715E]" />
            </div>
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              BPT Study Guide
            </span>
          </div>
        )}

        {/* Carousel Navigation Arrows (visible when multiple images) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Preview"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-80 sm:opacity-0 group-hover/slider:opacity-100 shadow-md active:scale-95 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Preview"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-80 sm:opacity-0 group-hover/slider:opacity-100 shadow-md active:scale-95 z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {images.length > 1 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white shadow-xs backdrop-blur-xs border border-white/20">
              <Eye className="w-3 h-3 text-emerald-400" />
              <span>
                {currentIndex === 0 ? `1/${images.length} Cover` : `${currentIndex + 1}/${images.length} Inside`}
              </span>
            </span>
          ) : (
            <span />
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-[#2D3436] shadow-xs backdrop-blur-xs border border-stone-200/80">
            <FileText className="w-3 h-3 text-[#5C715E]" />
            <span>PDF</span>
          </span>
        </div>

        {/* Slide Indicator Dots at Bottom */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-5 bg-white shadow-xs'
                    : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            onClick={() => onSelect(note)}
            className="font-bold text-[#2D3436] text-base sm:text-lg leading-snug cursor-pointer hover:text-[#5C715E] transition-colors line-clamp-2"
          >
            {note.title}
          </h3>

          {note.description && (
            <p className="mt-1.5 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
              {note.description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5C715E]" />
              <span>Instant Download</span>
            </span>
            <span>•</span>
            <span>{formattedSize}</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-stone-500 block font-medium">Price</span>
            <div className="text-xl sm:text-2xl font-extrabold text-[#2D3436] leading-none">
              ₹{note.price}
            </div>
          </div>

          <button
            id={`buy-now-btn-${note.id}`}
            onClick={() => onBuyNow(note)}
            className="flex-1 max-w-[150px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-sm shadow-[#5C715E]/20 transition-colors active:scale-98"
          >
            <span>Buy Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
