import React from 'react';
import { CreatorProfile } from '../types';
import { Instagram, Lock, BookOpen, ExternalLink, ShieldCheck, MessageCircle, Mail } from 'lucide-react';

interface HeaderProps {
  profile: CreatorProfile;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenPurchases?: () => void;
  notesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  isAdmin,
  onOpenAdmin,
  onOpenPurchases,
  notesCount,
}) => {
  const instagramUrl = profile.instagram_url || (profile.instagram_handle ? `https://instagram.com/${profile.instagram_handle}` : 'https://instagram.com');

  return (
    <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        {/* Creator Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#5C715E] flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-[#5C715E]/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-[#2D3436] leading-tight">
                {profile.name || "MEDICOS⛑️MINDS"}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F9F7F2] text-[#5C715E] border border-[#5C715E]/20">
                Official Store
              </span>
            </div>
            {profile.instagram_handle && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#5C715E] transition-colors font-medium"
              >
                <Instagram className="w-3.5 h-3.5 text-[#5C715E]" />
                <span>@{profile.instagram_handle}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenPurchases && (
            <button
              id="my-purchases-btn"
              onClick={onOpenPurchases}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-200"
              title="Access your purchased notes"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#5C715E]" />
              <span className="hidden xs:inline">My Purchases</span>
              <span className="xs:hidden">Purchases</span>
            </button>
          )}

          <a
            id="header-support-btn"
            href={`https://wa.me/${(profile.whatsapp_number || '+91 83407 49923').replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hello MEDICOS MINDS, I need support regarding notes")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
            title={`Contact Support: ${profile.whatsapp_number || '+91 83407 49923'}`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Support</span>
          </a>

          <a
            id="header-support-email"
            href={`mailto:${profile.support_email || 'restorehealthphysio@gmail.com'}`}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-200"
            title={`Email: ${profile.support_email || 'restorehealthphysio@gmail.com'}`}
          >
            <Mail className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-mono text-[11px]">{profile.support_email || 'restorehealthphysio@gmail.com'}</span>
          </a>

          {profile.instagram_handle && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="md:inline-flex hidden items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#5C715E] bg-[#F9F7F2] hover:bg-[#D9E4DD]/50 transition-colors border border-[#5C715E]/20"
            >
              <Instagram className="w-3.5 h-3.5 text-[#5C715E]" />
              <span>Instagram</span>
            </a>
          )}

          <button
            id="admin-panel-btn"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isAdmin
                ? 'bg-[#5C715E] text-white shadow-sm shadow-[#5C715E]/20 hover:bg-[#4A5D4E]'
                : 'bg-stone-100 text-[#2D3436] hover:bg-stone-200 border border-stone-200'
            }`}
            title="Creator Admin & Upload Panel"
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#D9E4DD]" />
                <span>Admin Panel</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Creator Login</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
