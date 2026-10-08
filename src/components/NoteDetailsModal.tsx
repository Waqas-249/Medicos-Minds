import React, { useState } from 'react';
import { Note } from '../types';
import { 
  X, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Download, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Maximize2 
} from 'lucide-react';

interface NoteDetailsModalProps {
  note: Note | null;
  onClose: () => void;
  onBuyNow: (note: Note) => void;
}

export const NoteDetailsModal: React.FC<NoteDetailsModalProps> = ({
  note,
  onClose,
  onBuyNow,
}) => {
  if (!note) return null;

  const images: string[] = [
    note.cover_image,
    ...(Array.isArray(note.preview_images) ? note.preview_images : []),
  ].filter(Boolean);

  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formattedSize = note.pdf_size
    ? note.pdf_size >= 1024 * 1024 * 1024
      ? (note.pdf_size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
      : (note.pdf_size / (1024 * 1024)).toFixed(1) + ' MB'
    : 'PDF Document';

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 35 && images.length > 1) {
      handleNext();
    } else if (diff < -35 && images.length > 1) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  const getSlideLabel = (idx: number) => {
    if (idx === 0) return 'Cover Thumbnail';
    return `Inside Page Preview ${idx}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id={`note-details-modal-${note.id}`}
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header Bar with Close Button */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Study Guide Preview
            </span>
            {images.length > 1 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {images.length} Previews
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Cover & Preview Image Slider - 100% full view with zero crop */}
          {images.length > 0 ? (
            <div className="space-y-3">
              <div 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative rounded-2xl overflow-hidden min-h-[260px] sm:min-h-[320px] max-h-[420px] h-[40vh] w-full bg-stone-950 border border-stone-200 shadow-xs flex items-center justify-center group select-none"
              >
                {/* Ambient background blur for aesthetic depth */}
                <img
                  src={images[activeSlide]}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-20 scale-110 pointer-events-none"
                />
                {/* 100% full view image, completely uncropped */}
                <img
                  src={images[activeSlide]}
                  alt={`${note.title} - ${getSlideLabel(activeSlide)}`}
                  referrerPolicy="no-referrer"
                  className="relative z-1 max-h-full max-w-full object-contain p-2"
                />

                {/* Left / Right Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Previous Slide"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md active:scale-95 z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next Slide"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-all shadow-md active:scale-95 z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Top Badge: Slide index & label */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-black/75 text-white shadow-xs backdrop-blur-xs border border-white/20">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{activeSlide + 1}/{images.length} • {getSlideLabel(activeSlide)}</span>
                  </span>
                </div>

                {/* Zoom Fullscreen trigger */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs transition-colors border border-white/20 shadow-xs"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Full View</span>
                </button>
              </div>

              {/* Thumbnail Strip (if multiple images) */}
              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all bg-stone-950 flex items-center justify-center p-1 ${
                        idx === activeSlide
                          ? 'border-[#5C715E] ring-2 ring-[#5C715E]/30 shadow-xs scale-102'
                          : 'border-stone-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumb ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute bottom-1 inset-x-1 text-[10px] font-bold text-white bg-black/70 px-1 py-0.5 rounded text-center truncate z-1">
                        {idx === 0 ? 'Cover' : `Preview ${idx}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#D9E4DD]/50 border border-[#5C715E]/20 p-8 flex flex-col items-center justify-center text-center h-48">
              <div className="w-14 h-14 rounded-2xl bg-[#5C715E] text-white flex items-center justify-center mb-2 shadow-xs">
                <FileText className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-[#2D3436]">
                Official PDF Study Guide
              </span>
            </div>
          )}

          {/* Title & Price */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2D3436] leading-tight">
                {note.title}
              </h2>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#5C715E]">
              ₹{note.price}
            </div>
          </div>

          {/* Description */}
          {note.description && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                Description & Content
              </h4>
              <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
                {note.description}
              </p>
            </div>
          )}

          {/* PDF Details Info Box */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#5C715E] shrink-0" />
              <div>
                <div className="text-stone-500 font-medium">Format</div>
                <div className="font-bold text-stone-800">PDF Document</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-2.5">
              <Download className="w-4 h-4 text-[#5C715E] shrink-0" />
              <div>
                <div className="text-stone-500 font-medium">File Size</div>
                <div className="font-bold text-stone-800">{formattedSize}</div>
              </div>
            </div>
          </div>

          {/* Features check */}
          <div className="space-y-2 text-xs text-stone-600 pt-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5C715E] shrink-0" />
              <span>Instant download immediately after payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#5C715E] shrink-0" />
              <span>Readable on Phone, iPad, Tablet, and Laptop</span>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-white flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            id="modal-buy-now-btn"
            onClick={() => {
              onClose();
              onBuyNow(note);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-base shadow-md shadow-[#5C715E]/20 transition-all active:scale-98"
          >
            <span>Buy Now — ₹{note.price}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox Modal */}
      {isFullscreen && images[activeSlide] && (
        <div 
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center">
            <img
              src={images[activeSlide]}
              alt="Fullscreen Preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <p className="text-white text-xs font-semibold mt-3 bg-black/60 px-3 py-1 rounded-full">
              {getSlideLabel(activeSlide)} ({activeSlide + 1} of {images.length})
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
