import React from 'react';
import { Note } from '../types';
import { X, FileText, ArrowRight, ShieldCheck, Download, Smartphone } from 'lucide-react';

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

  const formattedSize = note.pdf_size
    ? (note.pdf_size / (1024 * 1024)).toFixed(1) + ' MB'
    : 'PDF Document';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id={`note-details-modal-${note.id}`}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header Bar with Close Button */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Note Details
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Cover image */}
          {note.cover_image ? (
            <div className="rounded-2xl overflow-hidden aspect-16/10 bg-stone-100 border border-stone-200">
              <img
                src={note.cover_image}
                alt={note.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-[#D9E4DD]/50 border border-[#5C715E]/20 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#5C715E] text-white flex items-center justify-center mb-2 shadow-xs">
                <FileText className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-[#2D3436]">
                Official PDF Notes
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
    </div>
  );
};
