import React from 'react';
import { Note } from '../types';
import { NoteCard } from './NoteCard';
import { BookOpen, UploadCloud, Shield, Sparkles } from 'lucide-react';

interface NotesGridProps {
  notes: Note[];
  loading: boolean;
  onSelectNote: (note: Note) => void;
  onBuyNow: (note: Note) => void;
  onOpenAdmin: () => void;
}

export const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  loading,
  onSelectNote,
  onBuyNow,
  onOpenAdmin,
}) => {
  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#5C715E] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-stone-500 font-medium">Loading available notes...</p>
      </div>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2D3436] tracking-tight">
              Physiotherapy Notes & PDFs
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Select a note below to preview contents and get instant download access.
            </p>
          </div>
          {notes.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F9F7F2] text-[#5C715E] border border-[#5C715E]/20">
              {notes.length} {notes.length === 1 ? 'PDF Note' : 'PDF Notes'}
            </span>
          )}
        </div>
      </div>

      {/* Empty State when zero products (STRICT REQUIREMENT) */}
      {notes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#D9E4DD] text-[#5C715E] mx-auto flex items-center justify-center mb-4 border border-[#5C715E]/20 shadow-xs">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#2D3436]">
            No Notes Uploaded Yet
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto mt-2 leading-relaxed">
            The store is fresh and ready. As the creator, you can log in to your private admin panel now to upload your BPT notes, set your prices, and publish instantly.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="empty-state-upload-btn"
              onClick={onOpenAdmin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all active:scale-98"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Creator Login & Upload</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#5C715E]" />
              Secure Payment & Verification
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Instant Protected PDF Downloads
            </span>
          </div>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSelect={onSelectNote}
              onBuyNow={onBuyNow}
            />
          ))}
        </div>
      )}
    </section>
  );
};
