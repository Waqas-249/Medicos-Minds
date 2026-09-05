import React, { useState, useEffect, useRef } from 'react';
import { Note, Order, CreatorProfile } from '../types';
import {
  X,
  PlusCircle,
  ListFilter,
  ShoppingBag,
  Settings,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  HelpCircle,
  ExternalLink,
  LogOut,
  Download,
  IndianRupee
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  adminToken: string | null;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  onNotesUpdated: () => void;
  profile: CreatorProfile;
  onProfileUpdated: () => void;
}

type TabType = 'upload' | 'manage' | 'orders' | 'settings' | 'guide';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  isAdmin,
  adminToken,
  onLoginSuccess,
  onLogout,
  onNotesUpdated,
  profile,
  onProfileUpdated,
}) => {
  // Login Form State
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Admin Data State
  const [adminNotes, setAdminNotes] = useState<Note[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form State: Add / Edit Note
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings Form State
  const [settingsName, setSettingsName] = useState(profile.name);
  const [settingsBio, setSettingsBio] = useState(profile.bio);
  const [settingsIgHandle, setSettingsIgHandle] = useState(profile.instagram_handle);
  const [settingsIgUrl, setSettingsIgUrl] = useState(profile.instagram_url);
  const [settingsEmail, setSettingsEmail] = useState(profile.support_email);
  const [settingsUpiId, setSettingsUpiId] = useState(profile.upi_id || 'restorehealthphysio@okaxis');
  const [settingsRazorpayKey, setSettingsRazorpayKey] = useState(profile.razorpay_key_id || '');
  const [settingsRazorpaySecret, setSettingsRazorpaySecret] = useState('');
  const [settingsPaymentMode, setSettingsPaymentMode] = useState<'test' | 'live'>(profile.payment_mode || 'test');
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(profile.whatsapp_number || '+91 83407 49923');
  const [settingsPin, setSettingsPin] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Synchronize settings state when profile changes
  useEffect(() => {
    setSettingsName(profile.name);
    setSettingsBio(profile.bio);
    setSettingsIgHandle(profile.instagram_handle);
    setSettingsIgUrl(profile.instagram_url);
    setSettingsEmail(profile.support_email);
    if (profile.upi_id) setSettingsUpiId(profile.upi_id);
    if (profile.razorpay_key_id) setSettingsRazorpayKey(profile.razorpay_key_id);
    if (profile.payment_mode) setSettingsPaymentMode(profile.payment_mode);
    if (profile.whatsapp_number) setSettingsWhatsapp(profile.whatsapp_number);
  }, [profile]);

  // Fetch admin data when logged in
  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      const [notesRes, ordersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/notes', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setAdminNotes(notesData);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setAdminOrders(ordersData);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.upi_id) setSettingsUpiId(settingsData.upi_id);
        if (settingsData.razorpay_key_id) setSettingsRazorpayKey(settingsData.razorpay_key_id);
        if (settingsData.payment_mode) setSettingsPaymentMode(settingsData.payment_mode);
        if (settingsData.whatsapp_number) setSettingsWhatsapp(settingsData.whatsapp_number);
        if (settingsData.support_email) setSettingsEmail(settingsData.support_email);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminToken) {
      fetchAdminData();
    }
  }, [isAdmin, adminToken, activeTab]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid Admin PIN');
      }

      onLoginSuccess(data.token);
      setPinInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Cover File Selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCover(file);
      const url = URL.createObjectURL(file);
      setCoverPreviewUrl(url);
    }
  };

  // Handle PDF File Selection
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPdf(file);
    }
  };

  // Reset Add/Edit Form
  const resetForm = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    setFormPublished(true);
    setSelectedPdf(null);
    setSelectedCover(null);
    setCoverPreviewUrl(null);
    setFormMessage(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Start Editing a note
  const handleStartEdit = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormPrice(note.price.toString());
    setFormDescription(note.description || '');
    setFormPublished(note.published);
    setSelectedPdf(null);
    setSelectedCover(null);
    setCoverPreviewUrl(note.cover_image || null);
    setFormMessage(null);
    setActiveTab('upload');
  };

  // Handle Submit Form (Add or Update Note)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    if (!formTitle.trim()) {
      setFormMessage({ type: 'error', text: 'Please enter a note title.' });
      return;
    }

    if (formPrice === '' || Number(formPrice) < 0) {
      setFormMessage({ type: 'error', text: 'Please enter a valid price in ₹.' });
      return;
    }

    if (!editingNote && !selectedPdf) {
      setFormMessage({ type: 'error', text: 'Please upload a PDF file for this note.' });
      return;
    }

    setFormSubmitting(true);
    setFormMessage(null);

    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('price', formPrice.trim());
      formData.append('description', formDescription.trim());
      formData.append('published', String(formPublished));

      if (selectedPdf) {
        formData.append('pdf', selectedPdf);
      }
      if (selectedCover) {
        formData.append('cover', selectedCover);
      }

      const url = editingNote
        ? `/api/admin/notes/${editingNote.id}`
        : '/api/admin/notes';
      const method = editingNote ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note.');
      }

      setFormMessage({
        type: 'success',
        text: editingNote
          ? 'Note updated successfully!'
          : 'Note published! It is now live on your store.',
      });

      resetForm();
      fetchAdminData();
      onNotesUpdated();
      if (!editingNote) {
        setActiveTab('manage');
      }
    } catch (err: any) {
      setFormMessage({ type: 'error', text: err.message || 'Error uploading note.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!adminToken) return;
    if (!window.confirm('Are you sure you want to delete this note and its PDF? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete note');
      }

      fetchAdminData();
      onNotesUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not delete note.');
    }
  };

  // Handle Toggle Publish/Hide
  const handleTogglePublish = async (note: Note) => {
    if (!adminToken) return;

    try {
      const formData = new FormData();
      formData.append('published', String(!note.published));

      const res = await fetch(`/api/admin/notes/${note.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to update status');

      fetchAdminData();
      onNotesUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not toggle status.');
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSettingsSaving(true);
    setSettingsSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: settingsName,
          bio: settingsBio,
          instagram_handle: settingsIgHandle,
          instagram_url: settingsIgUrl,
          support_email: settingsEmail,
          whatsapp_number: settingsWhatsapp,
          upi_id: settingsUpiId,
          razorpay_key_id: settingsRazorpayKey,
          razorpay_key_secret: settingsRazorpaySecret || undefined,
          payment_mode: settingsPaymentMode,
          admin_pin: settingsPin || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      setSettingsSuccess(true);
      setSettingsPin('');
      setSettingsRazorpaySecret('');
      onProfileUpdated();
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div 
        id="admin-panel-modal"
        className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5C715E]/40 text-[#D9E4DD] flex items-center justify-center border border-[#5C715E]/50">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-none">
                Creator Admin Panel
              </h3>
              <span className="text-[11px] text-stone-400">
                {isAdmin ? 'Authenticated Session' : 'Private Access'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* IF NOT LOGGED IN: SHOW LOGIN SCREEN */}
        {!isAdmin ? (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center mb-3 shadow-xs">
              <Shield className="w-7 h-7" />
            </div>
            <h4 className="text-xl font-black text-[#2D3436]">Creator Authentication</h4>
            <p className="text-xs sm:text-sm text-stone-600 max-w-xs mt-1">
              Enter your Creator PIN to access your note uploads, pricing controls, and sales records.
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-xs mt-6 space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <input
                  id="admin-pin-input"
                  type="password"
                  required
                  placeholder="Enter PIN (Default: 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center px-4 py-3 rounded-xl border border-stone-300 text-base font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#5C715E] focus:border-transparent bg-stone-50"
                />
                <span className="text-[11px] text-stone-400 mt-1.5 block">
                  Default PIN is <strong className="text-[#2D3436]">1234</strong> (can be changed in Store Settings).
                </span>
              </div>

              <button
                id="admin-login-submit-btn"
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-colors disabled:opacity-50"
              >
                {loginLoading ? 'Authenticating...' : 'Unlock Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          /* IF LOGGED IN: TABS & CONTENT */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 px-4 pt-3 bg-stone-50 border-b border-stone-200 overflow-x-auto">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('upload');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors shrink-0 ${
                  activeTab === 'upload'
                    ? 'border-[#5C715E] bg-white text-[#2D3436]'
                    : 'border-transparent text-stone-600 hover:text-[#2D3436]'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{editingNote ? 'Edit Note' : 'Add New Note'}</span>
              </button>

              <button
                onClick={() => setActiveTab('manage')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors shrink-0 ${
                  activeTab === 'manage'
                    ? 'border-[#5C715E] bg-white text-[#2D3436]'
                    : 'border-transparent text-stone-600 hover:text-[#2D3436]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>My Notes ({adminNotes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors shrink-0 ${
                  activeTab === 'orders'
                    ? 'border-[#5C715E] bg-white text-[#2D3436]'
                    : 'border-transparent text-stone-600 hover:text-[#2D3436]'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Sales / Orders ({adminOrders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-[#5C715E] bg-white text-[#2D3436]'
                    : 'border-transparent text-stone-600 hover:text-[#2D3436]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Store Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors shrink-0 ${
                  activeTab === 'guide'
                    ? 'border-[#5C715E] bg-white text-[#2D3436]'
                    : 'border-transparent text-stone-600 hover:text-[#2D3436]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#5C715E]" />
                <span>Free Hosting Guide</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
              {/* TAB 1: ADD / EDIT NOTE */}
              {activeTab === 'upload' && (
                <div className="max-w-xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[#2D3436]">
                        {editingNote ? `Edit Note: ${editingNote.title}` : 'Add New Note'}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {editingNote
                          ? 'Update details or replace files for this note'
                          : 'Upload your BPT PDF study material and set your price'}
                      </p>
                    </div>
                    {editingNote && (
                      <button
                        onClick={resetForm}
                        className="text-xs font-bold text-stone-500 hover:text-[#2D3436]"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {formMessage && (
                    <div
                      className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                        formMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {formMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{formMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveNote} className="space-y-4">
                    {/* Note Title */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="note-form-title"
                        type="text"
                        required
                        placeholder="e.g. Anatomy Complete Notes, Electrotherapy Study Guide"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                      />
                    </div>

                    {/* Price in INR */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Price (₹ INR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 font-bold">
                          ₹
                        </div>
                        <input
                          id="note-form-price"
                          type="number"
                          min="0"
                          step="1"
                          required
                          placeholder="e.g. 249"
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-[#2D3436] focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                        />
                      </div>
                      <span className="text-[11px] text-stone-400 mt-1 block">
                        Set to 0 if offering a free sample/study guide.
                      </span>
                    </div>

                    {/* Short Description */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Description
                      </label>
                      <textarea
                        id="note-form-description"
                        rows={3}
                        placeholder="e.g. Complete high-yield notes covering Upper Limb, Lower Limb, Neuroanatomy diagrams and exam questions."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-stone-50"
                      />
                    </div>

                    {/* PDF Upload */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Upload PDF {!editingNote && <span className="text-red-500">*</span>}
                      </label>
                      <div className="border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-[#5C715E] transition-colors bg-stone-50">
                        <input
                          id="note-form-pdf-file"
                          type="file"
                          accept=".pdf,application/pdf"
                          ref={pdfInputRef}
                          onChange={handlePdfChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => pdfInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D3436] shadow-2xs hover:bg-stone-50"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#5C715E]" />
                          <span>{selectedPdf ? 'Change PDF' : 'Choose PDF File'}</span>
                        </button>
                        <div className="mt-2 text-xs text-stone-600">
                          {selectedPdf ? (
                            <span className="font-bold text-[#5C715E]">
                              Selected: {selectedPdf.name} ({(selectedPdf.size / (1024 * 1024)).toFixed(1)} MB)
                            </span>
                          ) : editingNote ? (
                            <span className="text-stone-500">
                              Current PDF: {editingNote.pdf_original_name || 'Uploaded PDF'} (leave unchanged or select a new file to replace)
                            </span>
                          ) : (
                            <span className="text-stone-400">PDF up to 50MB</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover Image Upload */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Upload Cover Image <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <div className="border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-[#5C715E] transition-colors bg-stone-50">
                        <input
                          id="note-form-cover-file"
                          type="file"
                          accept="image/*"
                          ref={coverInputRef}
                          onChange={handleCoverChange}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-4">
                          {coverPreviewUrl && (
                            <img
                              src={coverPreviewUrl}
                              alt="Cover Preview"
                              className="w-16 h-16 rounded-xl object-cover border border-stone-300 shadow-2xs"
                            />
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D3436] shadow-2xs hover:bg-stone-50"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#5C715E]" />
                              <span>{coverPreviewUrl ? 'Change Image' : 'Choose Image'}</span>
                            </button>
                            <span className="block text-[11px] text-stone-400 mt-1">
                              JPG, PNG, or WebP thumbnail
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Publish Status Toggle */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="note-form-published-checkbox"
                        type="checkbox"
                        checked={formPublished}
                        onChange={(e) => setFormPublished(e.target.checked)}
                        className="w-4 h-4 text-[#5C715E] rounded border-stone-300 focus:ring-[#5C715E]"
                      />
                      <label htmlFor="note-form-published-checkbox" className="text-xs font-bold text-stone-700 cursor-pointer">
                        Publish immediately (make visible to students on store)
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        id="publish-note-btn"
                        type="submit"
                        disabled={formSubmitting}
                        className="w-full py-3.5 px-4 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-black text-sm shadow-md shadow-[#5C715E]/20 transition-colors disabled:opacity-50 active:scale-98"
                      >
                        {formSubmitting ? (
                          'Saving & Processing...'
                        ) : editingNote ? (
                          'UPDATE NOTE'
                        ) : (
                          'PUBLISH NOTE'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: MANAGE EXISTING NOTES */}
              {activeTab === 'manage' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-[#2D3436]">Your Uploaded Notes</h4>
                      <p className="text-xs text-stone-500">
                        Edit prices, replace PDFs, hide from public store, or delete
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetForm();
                        setActiveTab('upload');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5C715E] text-white rounded-lg text-xs font-bold shadow-2xs hover:bg-[#4A5D4E]"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add New Note</span>
                    </button>
                  </div>

                  {loadingData ? (
                    <div className="py-12 text-center text-xs text-stone-500">
                      Loading notes...
                    </div>
                  ) : adminNotes.length === 0 ? (
                    <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                      <p className="text-sm font-bold text-[#2D3436]">You haven't uploaded any notes yet.</p>
                      <p className="text-xs text-stone-500 mt-1">Click "Add New Note" above to upload your first study guide.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                      {adminNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {note.cover_image ? (
                              <img
                                src={note.cover_image}
                                alt={note.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-[#2D3436] text-sm">{note.title}</h5>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    note.published
                                      ? 'bg-[#D9E4DD] text-[#2D3436]'
                                      : 'bg-stone-200 text-stone-700'
                                  }`}
                                >
                                  {note.published ? 'Live on Store' : 'Hidden/Draft'}
                                </span>
                              </div>
                              <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                                <span className="font-extrabold text-[#2D3436]">₹{note.price}</span>
                                <span>•</span>
                                <span>{note.pdf_original_name || 'PDF uploaded'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => handleTogglePublish(note)}
                              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200 transition-colors text-xs font-semibold flex items-center gap-1"
                              title={note.published ? 'Hide from public store' : 'Publish to public store'}
                            >
                              {note.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              <span className="hidden sm:inline">{note.published ? 'Hide' : 'Publish'}</span>
                            </button>

                            <button
                              onClick={() => handleStartEdit(note)}
                              className="p-2 rounded-lg text-[#5C715E] bg-[#F9F7F2] hover:bg-[#D9E4DD]/50 transition-colors text-xs font-semibold flex items-center gap-1 border border-[#5C715E]/20"
                              title="Edit note details or price"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORDERS & SALES */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-[#2D3436]">Student Orders & Purchases</h4>
                    <p className="text-xs text-stone-500">
                      Real-time verified student purchases and access logs
                    </p>
                  </div>

                  {loadingData ? (
                    <div className="py-12 text-center text-xs text-stone-500">
                      Loading orders...
                    </div>
                  ) : adminOrders.length === 0 ? (
                    <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                      <p className="text-sm font-bold text-[#2D3436]">No orders recorded yet.</p>
                      <p className="text-xs text-stone-500 mt-1">Purchases made by students will appear here automatically.</p>
                    </div>
                  ) : (
                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden text-xs">
                      {adminOrders.map((order) => (
                        <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between gap-3 hover:bg-stone-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#2D3436] text-sm">
                                {order.customer_name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  order.status === 'paid'
                                    ? 'bg-[#D9E4DD] text-[#2D3436]'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {order.status === 'paid' ? 'Paid & Verified' : order.status}
                              </span>
                              {order.payment_method && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 uppercase">
                                  {order.payment_method}
                                </span>
                              )}
                            </div>
                            <div className="text-stone-600 mt-1">
                              <strong>Note:</strong> {order.note_title} • <strong>Paid:</strong> ₹{order.amount}
                            </div>
                            <div className="text-stone-500 mt-0.5">
                              <span>{order.customer_email}</span>
                              {order.customer_phone && <span> • +91 {order.customer_phone}</span>}
                            </div>
                            {(order.utr_number || order.payment_id) && (
                              <div className="text-[11px] font-mono text-stone-500 mt-1">
                                Ref: {order.utr_number || order.payment_id}
                              </div>
                            )}
                            {order.download_token && (
                              <div className="flex items-center gap-2 mt-2">
                                <a
                                  href={`/api/view/${order.download_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-[#5C715E] hover:underline"
                                >
                                  Preview PDF ↗
                                </a>
                                <span className="text-stone-300">•</span>
                                <a
                                  href={`/api/download/${order.download_token}`}
                                  className="text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:underline"
                                >
                                  Download File
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="text-right text-stone-400 self-start sm:self-center">
                            <div>{new Date(order.created_at).toLocaleDateString()}</div>
                            <div className="text-[11px] text-stone-500">
                              Downloads: {order.download_count || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STORE PROFILE & SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-lg mx-auto">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-[#2D3436]">Store Profile & Payment Gateway</h4>
                    <p className="text-xs text-stone-500">
                      Configure your public profile, UPI ID, Razorpay gateway credentials, and security
                    </p>
                  </div>

                  {settingsSuccess && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Store and payment settings updated successfully!</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    {/* Section 1: Brand & Profile */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                      <h5 className="text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                        Store & Instagram Profile
                      </h5>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Creator / Store Name
                        </label>
                        <input
                          type="text"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Short Intro / Bio
                        </label>
                        <textarea
                          rows={2}
                          value={settingsBio}
                          onChange={(e) => setSettingsBio(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Instagram Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 font-bold">
                            @
                          </div>
                          <input
                            type="text"
                            placeholder="restore_healthphysio"
                            value={settingsIgHandle}
                            onChange={(e) => setSettingsIgHandle(e.target.value)}
                            className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Support WhatsApp / Mobile <span className="text-stone-400 font-normal">(Help Hotline)</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="+91 83407 49923"
                          value={settingsWhatsapp}
                          onChange={(e) => setSettingsWhatsapp(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Support Email Address <span className="text-stone-400 font-normal">(Help & Support)</span>
                        </label>
                        <input
                          type="email"
                          placeholder="restorehealthphysio@gmail.com"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>
                    </div>

                    {/* Section 2: Payment Gateway & UPI Settings (Instruction 18) */}
                    <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#5C715E]/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                          Payment System Settings (Instruction 18)
                        </h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9E4DD] text-[#2D3436]">
                          {settingsPaymentMode === 'live' ? 'Live Mode' : 'Test Mode'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Payment Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSettingsPaymentMode('test')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              settingsPaymentMode === 'test'
                                ? 'bg-white border-[#5C715E] text-[#2D3436] shadow-xs'
                                : 'bg-transparent border-stone-200 text-stone-500'
                            }`}
                          >
                            🧪 Test / Sandbox Mode
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettingsPaymentMode('live')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              settingsPaymentMode === 'live'
                                ? 'bg-[#5C715E] border-[#5C715E] text-white shadow-xs'
                                : 'bg-transparent border-stone-200 text-stone-500'
                            }`}
                          >
                            ⚡ Live Production Mode
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Your UPI ID (VPA) <span className="text-stone-400 font-normal">for dynamic QR Code</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 8340749923@paytm or yourname@okhdfcbank"
                          value={settingsUpiId}
                          onChange={(e) => setSettingsUpiId(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Students scan the dynamic QR code during checkout or tap "Pay with UPI App" on mobile. Payments go directly to this UPI ID with zero gateway fees.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-stone-700">
                            Razorpay Key ID <span className="text-stone-400 font-normal">(for Cards, UPI & Netbanking)</span>
                          </label>
                          <a
                            href="https://dashboard.razorpay.com/app/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#5C715E] hover:underline font-semibold"
                          >
                            Get API Key &rarr;
                          </a>
                        </div>
                        <input
                          type="text"
                          placeholder="rzp_live_... or rzp_test_..."
                          value={settingsRazorpayKey}
                          onChange={(e) => setSettingsRazorpayKey(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Razorpay Key Secret <span className="text-stone-400 font-normal">(Leave blank to keep current)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={settingsRazorpaySecret}
                          onChange={(e) => setSettingsRazorpaySecret(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>
                    </div>

                    {/* Section 3: Security & PIN */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                      <h5 className="text-xs font-bold text-[#2D3436] uppercase tracking-wider">
                        Security PIN
                      </h5>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Change Admin PIN <span className="text-stone-400 font-normal">(Leave blank to keep current)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new PIN"
                          value={settingsPin}
                          onChange={(e) => setSettingsPin(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="w-full py-3.5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all disabled:opacity-50"
                    >
                      {settingsSaving ? 'Saving Settings...' : 'Save All Settings'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: PUBLISH & PAYMENT INTEGRATION GUIDE */}
              {activeTab === 'guide' && (
                <div className="max-w-2xl mx-auto space-y-5 text-xs text-stone-700 leading-relaxed">
                  <div className="p-4 bg-[#D9E4DD]/50 border border-[#5C715E]/30 rounded-2xl">
                    <h4 className="font-extrabold text-[#2D3436] text-sm mb-1">
                      🚀 Ready to Publish: Step-by-Step Guide
                    </h4>
                    <p className="text-stone-700">
                      Follow these simple steps to activate live payments, publish your store, and start selling your medical & study notes with zero monthly hosting costs.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1: Razorpay Integration */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                          1. Razorpay Payment Gateway Integration
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          Cards • UPI • Netbanking
                        </span>
                      </div>
                      <p>
                        Razorpay allows students to pay using any UPI app (GPay, PhonePe, Paytm), credit/debit cards, and Net Banking.
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1">
                        <li>
                          Sign up for a free merchant account at{' '}
                          <a
                            href="https://razorpay.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#5C715E] font-bold underline"
                          >
                            razorpay.com
                          </a>.
                        </li>
                        <li>Complete standard KYC with your PAN card and bank account details (where money will be deposited).</li>
                        <li>
                          Go to <strong>Account & Settings</strong> &rarr; <strong>API Keys</strong> &rarr; click <strong>Generate Key</strong>.
                        </li>
                        <li>
                          Copy your <strong>Key ID</strong> (starts with <code className="bg-white px-1 rounded font-mono border">rzp_test_...</code> or <code className="bg-white px-1 rounded font-mono border">rzp_live_...</code>) and <strong>Key Secret</strong>.
                        </li>
                        <li>
                          Paste both into the <strong>Settings tab</strong> in this Admin Panel.
                        </li>
                        <li>
                          Toggle payment mode to <strong>⚡ Live Production Mode</strong> when you are ready to collect real payments!
                        </li>
                      </ol>
                    </div>

                    {/* Step 2: Instant Direct UPI (Zero Commission) */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                          2. Direct UPI QR Code (Zero Fees & Direct Bank Settlement)
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          0% Fee • Instant
                        </span>
                      </div>
                      <p>
                        Don't want gateway transaction charges? Enter your personal or business UPI ID (e.g., <code className="bg-white px-1 rounded font-mono border">8340749923@paytm</code> or <code className="bg-white px-1 rounded font-mono border">yourname@okhdfcbank</code>) in the <strong>Settings</strong> tab.
                      </p>
                      <p className="text-stone-600">
                        Students can scan the dynamic QR code generated specifically for that note or tap "Pay with UPI App" on their phone. Money lands directly in your bank account!
                      </p>
                    </div>

                    {/* Step 3: Publishing the Store */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                        3. How to Publish & Go Live
                      </h5>
                      <p>
                        Your web app is fully self-contained and ready to deploy:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-stone-600 pl-1">
                        <li>
                          <strong>Direct Deployment:</strong> Use the "Deploy" button in Google AI Studio to launch on Cloud Run with an official, high-speed public link.
                        </li>
                        <li>
                          <strong>Free Hosting:</strong> You can also export the repository and run on Render, Railway, or Vercel with 100% free hosting.
                        </li>
                        <li>
                          <strong>Custom Domain:</strong> You can map your own domain (e.g., <code className="bg-white px-1 rounded font-mono border">medicosminds.com</code>) at any time.
                        </li>
                      </ul>
                    </div>

                    {/* Step 4: Sharing & Promoting */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                        4. Promoting to Students
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-stone-600 pl-1">
                        <li>Add your store URL to your Instagram Bio (<code className="bg-white px-1 rounded font-mono border">@restore_healthphysio</code>).</li>
                        <li>Put the link in your WhatsApp Status and broadcast groups.</li>
                        <li>Add your support contact <code className="bg-white px-1 rounded font-mono border">+91 83407 49923</code> and email <code className="bg-white px-1 rounded font-mono border">restorehealthphysio@gmail.com</code> so students can reach you instantly.</li>
                      </ul>
                    </div>

                    {/* Step 5: PDF Delivery & Customer Lookup */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                        5. Automated Note Delivery & Support
                      </h5>
                      <p>
                        Once payment is verified, students immediately receive:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-stone-600 pl-1">
                        <li>A direct high-speed download link for their PDF.</li>
                        <li>A "Read Online" in-browser reader for mobile & tablet viewing.</li>
                        <li>Self-service access via the <strong>"My Notes"</strong> button using their checkout email.</li>
                        <li>Direct 1-tap WhatsApp support link to <code className="bg-white px-1 rounded font-mono border">+91 83407 49923</code> or email <code className="bg-white px-1 rounded font-mono border">restorehealthphysio@gmail.com</code> if they ever need help.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
