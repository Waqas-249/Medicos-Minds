import React, { useState, useEffect } from 'react';
import { Note, CreatorProfile } from './types';
import { Header } from './components/Header';
import { NotesGrid } from './components/NotesGrid';
import { NoteDetailsModal } from './components/NoteDetailsModal';
import { CheckoutModal } from './components/CheckoutModal';
import { PurchasesModal } from './components/PurchasesModal';
import { AdminPanel } from './components/AdminPanel';
import { Footer } from './components/Footer';
import { Instagram, GraduationCap, ShieldCheck, Zap, BookOpen } from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<CreatorProfile>({
    name: 'MEDICOS⛑️MINDS',
    bio: 'BPT Notes & High-Yield Visual Study Guides for Physiotherapy Students',
    instagram_handle: 'restore_healthphysio',
    instagram_url: 'https://instagram.com/restore_healthphysio',
    support_email: 'restorehealthphysio@gmail.com',
    whatsapp_number: '+91 83407 49923',
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [checkoutNote, setCheckoutNote] = useState<Note | null>(null);
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Admin authentication state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('physio_admin_token');
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin session validity
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => {
          if (res.ok) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            setAdminToken(null);
            localStorage.removeItem('physio_admin_token');
          }
        })
        .catch(() => {
          setIsAdmin(false);
        });
    } else {
      setIsAdmin(false);
    }
  }, [adminToken]);

  // Fetch Public Profile Settings
  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Fetch Public Notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchNotes();
  }, []);

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    setIsAdmin(true);
    localStorage.setItem('physio_admin_token', token);
  };

  const handleAdminLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    setAdminToken(null);
    setIsAdmin(false);
    localStorage.removeItem('physio_admin_token');
  };

  const instagramUrl = profile.instagram_url || (profile.instagram_handle ? `https://instagram.com/${profile.instagram_handle}` : 'https://instagram.com');

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#2D3436] font-sans">
      {/* Top Header */}
      <Header
        profile={profile}
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenPurchases={() => setIsPurchasesOpen(true)}
        notesCount={notes.length}
      />

      {/* Hero / Creator Intro Banner */}
      <section className="w-full bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#5C715E] text-white flex items-center justify-center font-black text-3xl shadow-md shadow-[#5C715E]/15 shrink-0">
              <GraduationCap className="w-12 h-12" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2D3436] tracking-tight">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D9E4DD] text-[#2D3436] border border-[#5C715E]/20">
                  BPT Study Hub
                </span>
              </div>

              <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                {profile.bio || "Handcrafted high-yield physiotherapy study notes, exam questions, and anatomy diagrams."}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                {profile.instagram_handle && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9F7F2] hover:bg-[#D9E4DD]/50 text-[#5C715E] font-bold border border-[#5C715E]/20 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5 text-[#5C715E]" />
                    <span>Follow on Instagram @{profile.instagram_handle}</span>
                  </a>
                )}

                <div className="flex items-center gap-1 text-stone-500 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Instant PDF Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Notes Grid */}
      <main className="flex-1">
        <NotesGrid
          notes={notes}
          loading={loading}
          onSelectNote={(note) => setSelectedNote(note)}
          onBuyNow={(note) => setCheckoutNote(note)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      </main>

      {/* Note Details Modal */}
      {selectedNote && (
        <NoteDetailsModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onBuyNow={(note) => {
            setSelectedNote(null);
            setCheckoutNote(note);
          }}
        />
      )}

      {/* Checkout & Instant Download Modal */}
      {checkoutNote && (
        <CheckoutModal
          note={checkoutNote}
          onClose={() => setCheckoutNote(null)}
        />
      )}

      {/* Creator Admin & Upload Panel */}
      {isAdminOpen && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          isAdmin={isAdmin}
          adminToken={adminToken}
          onLoginSuccess={handleAdminLoginSuccess}
          onLogout={handleAdminLogout}
          onNotesUpdated={fetchNotes}
          profile={profile}
          onProfileUpdated={fetchProfile}
        />
      )}

      {/* Purchases Lookup Modal */}
      {isPurchasesOpen && (
        <PurchasesModal
          isOpen={isPurchasesOpen}
          onClose={() => setIsPurchasesOpen(false)}
        />
      )}

      {/* Footer */}
      <Footer
        profile={profile}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenPurchases={() => setIsPurchasesOpen(true)}
      />
    </div>
  );
}
