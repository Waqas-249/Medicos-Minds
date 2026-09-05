import React from 'react';
import { Note } from '../types';
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  onBuyNow: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onSelect, onBuyNow }) => {
  const formattedSize = note.pdf_size
    ? (note.pdf_size / (1024 * 1024)).toFixed(1) + ' MB'
    : 'PDF Notes';

  return (
    <div
      id={`note-card-${note.id}`}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
    >
      {/* Cover Image Container */}
      <div 
        onClick={() => onSelect(note)}
        className="relative aspect-4/3 w-full bg-stone-100 cursor-pointer overflow-hidden border-b border-stone-100 flex items-center justify-center"
      >
        {note.cover_image ? (
          <img
            src={note.cover_image}
            alt={note.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-stone-400">
            <div className="w-12 h-12 rounded-xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center mb-2 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              PDF Study Guide
            </span>
          </div>
        )}

        {/* Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-[#2D3436] shadow-xs backdrop-blur-xs border border-stone-200/80">
            <FileText className="w-3 h-3 text-[#5C715E]" />
            <span>PDF</span>
          </span>
        </div>
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
