import React from 'react';
import { CreatorProfile } from '../types';
import { Instagram, Mail, ShieldCheck, MessageCircle, Phone } from 'lucide-react';

interface FooterProps {
  profile: CreatorProfile;
  onOpenAdmin: () => void;
  onOpenPurchases?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ profile, onOpenAdmin, onOpenPurchases }) => {
  const instagramUrl = profile.instagram_url || (profile.instagram_handle ? `https://instagram.com/${profile.instagram_handle}` : 'https://instagram.com');
  const supportPhone = profile.whatsapp_number || '+91 83407 49923';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello MEDICOS MINDS, I need support regarding notes")}`;

  return (
    <footer className="w-full bg-white border-t border-stone-200 mt-12 py-8 px-4 text-stone-600 text-xs">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <div className="font-bold text-[#2D3436] text-sm">
            {profile.name || "MEDICOS⛑️MINDS"}
          </div>
          <p className="text-stone-500 mt-0.5 max-w-sm">
            {profile.bio || "High-yield educational study notes for BPT & Physiotherapy students."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenPurchases && (
            <button
              onClick={onOpenPurchases}
              className="text-[#5C715E] hover:underline font-bold"
            >
              My Purchased Notes
            </button>
          )}

          {profile.instagram_handle && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#5C715E] hover:text-[#4A5D4E] font-semibold"
            >
              <Instagram className="w-4 h-4" />
              <span>@{profile.instagram_handle}</span>
            </a>
          )}

          {supportPhone && (
            <a
              id="footer-contact-support"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold transition-colors"
              title="Contact Support on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contact Support: <span className="font-mono">{supportPhone}</span></span>
            </a>
          )}

          <a
            id="footer-email-support"
            href={`mailto:${profile.support_email || 'restorehealthphysio@gmail.com'}`}
            className="inline-flex items-center gap-1.5 text-stone-700 hover:text-[#2D3436] bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl border border-stone-200 font-semibold transition-colors"
            title={`Email Support: ${profile.support_email || 'restorehealthphysio@gmail.com'}`}
          >
            <Mail className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-mono">{profile.support_email || 'restorehealthphysio@gmail.com'}</span>
          </a>

          <button
            onClick={onOpenAdmin}
            className="text-stone-500 hover:text-[#5C715E] underline font-medium"
          >
            Creator Portal
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-stone-400 text-[11px]">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5C715E]" />
          <span>Secure checkout with instant digital delivery • Helpline: {supportPhone} • {profile.support_email || 'restorehealthphysio@gmail.com'}</span>
        </div>
        <div>
          Designed for mobile & Instagram bio link
        </div>
      </div>
    </footer>
  );
};
