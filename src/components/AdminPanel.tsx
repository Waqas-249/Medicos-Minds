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
  IndianRupee,
  Clock,
  XCircle,
  Zap,
  ShieldCheck
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
  
  // Cover Image (Slot 1)
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  // Inside Page Preview 1 (Slot 2)
  const [selectedPreview1, setSelectedPreview1] = useState<File | null>(null);
  const [preview1Url, setPreview1Url] = useState<string | null>(null);
  const [removePreview1, setRemovePreview1] = useState(false);

  // Inside Page Preview 2 (Slot 3)
  const [selectedPreview2, setSelectedPreview2] = useState<File | null>(null);
  const [preview2Url, setPreview2Url] = useState<string | null>(null);
  const [removePreview2, setRemovePreview2] = useState(false);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings Form State
  const [settingsName, setSettingsName] = useState(profile.name);
  const [settingsBio, setSettingsBio] = useState(profile.bio);
  const [settingsIgHandle, setSettingsIgHandle] = useState(profile.instagram_handle);
  const [settingsIgUrl, setSettingsIgUrl] = useState(profile.instagram_url);
  const [settingsEmail, setSettingsEmail] = useState(profile.support_email);
  const [settingsUpiId, setSettingsUpiId] = useState(profile.upi_id || '');
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(profile.whatsapp_number || '+91 83407 49923');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Security PIN Change State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  const [pinChangeMessage, setPinChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-App Deletion Modal State (Replaces blocked window.confirm)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [manageNotification, setManageNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Order Approval & Rejection State
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [orderNotification, setOrderNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-App Order Deletion State
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [showClearOrdersModal, setShowClearOrdersModal] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const preview1InputRef = useRef<HTMLInputElement>(null);
  const preview2InputRef = useRef<HTMLInputElement>(null);

  // Synchronize settings state when profile changes
  useEffect(() => {
    setSettingsName(profile.name);
    setSettingsBio(profile.bio);
    setSettingsIgHandle(profile.instagram_handle);
    setSettingsIgUrl(profile.instagram_url);
    setSettingsEmail(profile.support_email);
    if (profile.upi_id) setSettingsUpiId(profile.upi_id);
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
        if (settingsData.name) setSettingsName(settingsData.name);
        if (settingsData.bio !== undefined) setSettingsBio(settingsData.bio);
        if (settingsData.instagram_handle !== undefined) setSettingsIgHandle(settingsData.instagram_handle);
        if (settingsData.instagram_url !== undefined) setSettingsIgUrl(settingsData.instagram_url);
        if (settingsData.upi_id) setSettingsUpiId(settingsData.upi_id);
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

  // Handle Cover File Selection (Slot 1)
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCover(file);
      const url = URL.createObjectURL(file);
      setCoverPreviewUrl(url);
      setRemoveCover(false);
    }
  };

  // Handle Preview 1 File Selection (Slot 2)
  const handlePreview1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPreview1(file);
      const url = URL.createObjectURL(file);
      setPreview1Url(url);
      setRemovePreview1(false);
    }
  };

  // Handle Preview 2 File Selection (Slot 3)
  const handlePreview2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPreview2(file);
      const url = URL.createObjectURL(file);
      setPreview2Url(url);
      setRemovePreview2(false);
    }
  };

  // Handle PDF File Selection (3GB Limit)
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024 * 1024) {
        setFormMessage({ type: 'error', text: 'PDF file size exceeds the 3 GB maximum limit.' });
        setSelectedPdf(null);
        if (pdfInputRef.current) pdfInputRef.current.value = '';
        return;
      }
      setSelectedPdf(file);
      setFormMessage(null);
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
    setRemoveCover(false);
    setSelectedPreview1(null);
    setPreview1Url(null);
    setRemovePreview1(false);
    setSelectedPreview2(null);
    setPreview2Url(null);
    setRemovePreview2(false);
    setFormMessage(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (preview1InputRef.current) preview1InputRef.current.value = '';
    if (preview2InputRef.current) preview2InputRef.current.value = '';
  };

  // Start Editing a note
  const handleStartEdit = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormPrice(note.price.toString());
    setFormDescription(note.description || '');
    setFormPublished(note.published);
    setSelectedPdf(null);
    
    // Cover image
    setSelectedCover(null);
    setCoverPreviewUrl(note.cover_image || null);
    setRemoveCover(false);

    // Previews
    setSelectedPreview1(null);
    setPreview1Url(note.preview_images?.[0] || null);
    setRemovePreview1(false);

    setSelectedPreview2(null);
    setPreview2Url(note.preview_images?.[1] || null);
    setRemovePreview2(false);

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
      
      // Cover (Slot 1)
      if (selectedCover) {
        formData.append('cover', selectedCover);
      } else if (removeCover) {
        formData.append('remove_cover', 'true');
      }

      // Preview 1 (Slot 2)
      if (selectedPreview1) {
        formData.append('preview_1', selectedPreview1);
      } else if (removePreview1) {
        formData.append('remove_preview_1', 'true');
      }

      // Preview 2 (Slot 3)
      if (selectedPreview2) {
        formData.append('preview_2', selectedPreview2);
      } else if (removePreview2) {
        formData.append('remove_preview_2', 'true');
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

  // Prompt Delete Note Confirmation Dialog (100% In-App, never blocked by iframe)
  const handlePromptDelete = (note: Note) => {
    setDeleteError(null);
    setNoteToDelete(note);
  };

  // Execute Note Deletion
  const handleConfirmDelete = async () => {
    if (!adminToken || !noteToDelete) return;
    setIsDeletingNote(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/notes/${noteToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      const deletedTitle = noteToDelete.title;
      setNoteToDelete(null);
      setManageNotification({
        type: 'success',
        text: `"${deletedTitle}" and its PDF have been permanently deleted from your store.`,
      });
      setTimeout(() => setManageNotification(null), 5000);

      // Refresh admin data and store notes
      await fetchAdminData();
      onNotesUpdated();
    } catch (err: any) {
      setDeleteError(err.message || 'Could not delete note. Please check your connection and try again.');
    } finally {
      setIsDeletingNote(false);
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

      setManageNotification({
        type: 'success',
        text: `"${note.title}" is now ${!note.published ? 'Live on Store' : 'Hidden from Store'}.`,
      });
      setTimeout(() => setManageNotification(null), 4000);

      fetchAdminData();
      onNotesUpdated();
    } catch (err: any) {
      setManageNotification({
        type: 'error',
        text: err.message || 'Could not toggle status.',
      });
      setTimeout(() => setManageNotification(null), 4000);
    }
  };

  // Handle Approve Order
  const handleApproveOrder = async (orderId: string) => {
    if (!adminToken || processingOrderId) return;
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve order');
      
      setOrderNotification({
        type: 'success',
        text: 'Order approved! Student PDF access has been unlocked.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
      await fetchAdminData();
    } catch (err: any) {
      setOrderNotification({
        type: 'error',
        text: err.message || 'Could not approve order.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Handle Reject Order (Direct, instant rejection with live status update)
  const handleRejectOrder = async (orderId: string) => {
    if (!adminToken || processingOrderId) return;
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');
      
      setOrderNotification({
        type: 'success',
        text: 'Order rejected! Access to note PDF has been denied.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
      await fetchAdminData();
    } catch (err: any) {
      setOrderNotification({
        type: 'error',
        text: err.message || 'Could not reject order.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Handle Delete Single Order
  const handleConfirmDeleteOrder = async () => {
    if (!adminToken || !orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete order');

      setOrderToDelete(null);
      setOrderNotification({
        type: 'success',
        text: 'Order record deleted successfully.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
      await fetchAdminData();
    } catch (err: any) {
      setOrderNotification({
        type: 'error',
        text: err.message || 'Could not delete order record.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Handle Clear All Orders (Wipe Sales History)
  const handleConfirmClearAllOrders = async () => {
    if (!adminToken) return;
    setIsClearingOrders(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear sales history');

      setShowClearOrdersModal(false);
      setOrderNotification({
        type: 'success',
        text: 'All sales history cleared successfully.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
      await fetchAdminData();
    } catch (err: any) {
      setOrderNotification({
        type: 'error',
        text: err.message || 'Could not clear sales history.',
      });
      setTimeout(() => setOrderNotification(null), 4000);
    } finally {
      setIsClearingOrders(false);
    }
  };

  // Handle Save Settings (Store Profile & Permanent UPI ID)
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
          upi_id: settingsUpiId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setSettingsSuccess(true);
      onProfileUpdated();
      setTimeout(() => setSettingsSuccess(false), 3500);
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Handle Dedicated Change Security PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    if (!newPinInput || newPinInput.trim().length < 4) {
      setPinChangeMessage({ type: 'error', text: 'New PIN must be at least 4 digits or characters long.' });
      return;
    }

    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeMessage({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    setPinChangeLoading(true);
    setPinChangeMessage(null);

    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          current_pin: currentPinInput.trim(),
          new_pin: newPinInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update security PIN');
      }

      setPinChangeMessage({
        type: 'success',
        text: `Security PIN updated to "${newPinInput.trim()}" successfully! Use this new PIN for future logins.`,
      });
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      onProfileUpdated();
      setTimeout(() => setPinChangeMessage(null), 5000);
    } catch (err: any) {
      setPinChangeMessage({ type: 'error', text: err.message || 'Could not change PIN.' });
    } finally {
      setPinChangeLoading(false);
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

                    {/* PDF Upload (Up to 3 GB) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                          Upload PDF {!editingNote && <span className="text-red-500">*</span>}
                        </label>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Expanded Limit: Up to 3 GB
                        </span>
                      </div>
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-[#2D3436] shadow-2xs hover:bg-stone-50 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-[#5C715E]" />
                          <span>{selectedPdf ? 'Change PDF File' : 'Choose PDF File (Up to 3 GB)'}</span>
                        </button>
                        <div className="mt-2 text-xs text-stone-600">
                          {selectedPdf ? (
                            <span className="font-bold text-[#5C715E]">
                              Selected: {selectedPdf.name} (
                              {selectedPdf.size >= 1024 * 1024 * 1024
                                ? (selectedPdf.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                                : (selectedPdf.size / (1024 * 1024)).toFixed(1) + ' MB'}
                              )
                            </span>
                          ) : editingNote ? (
                            <span className="text-stone-500">
                              Current PDF: {editingNote.pdf_original_name || 'Uploaded PDF'} (leave unchanged or select a new file to replace)
                            </span>
                          ) : (
                            <span className="text-stone-500">PDF study guides supported up to 3 GB size</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Images Section: 1 Cover Thumbnail + 2 Inside Page Previews (100% uncropped) */}
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                            Note Images (Any Size & Aspect Ratio)
                          </label>
                          <p className="text-[11px] text-stone-500">
                            Upload 1 main thumbnail + up to 2 inside page previews. Shows 100% of your image with zero cutting from top, bottom, or sides.
                          </p>
                        </div>
                        <span className="self-start sm:self-auto text-[10px] font-bold text-[#5C715E] bg-[#D9E4DD] px-2.5 py-0.5 rounded-full">
                          100% Full View • No Cropping
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Slot 1: Main Cover Thumbnail */}
                        <div className="border border-stone-200 rounded-2xl p-3 bg-stone-50/80 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#2D3436]">1. Main Cover</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Thumbnail
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 mb-2">
                              Primary cover shown on cards & first slide
                            </p>

                            <input
                              id="note-form-cover-file"
                              type="file"
                              accept="image/*"
                              ref={coverInputRef}
                              onChange={handleCoverChange}
                              className="hidden"
                            />

                            <div className="relative h-36 w-full rounded-xl bg-stone-950 border border-stone-200 overflow-hidden flex items-center justify-center mb-2.5 p-1">
                              {coverPreviewUrl && !removeCover ? (
                                <img
                                  src={coverPreviewUrl}
                                  alt="Cover Preview"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="text-center p-2 text-stone-400">
                                  <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                  <span className="text-[10px] block font-medium">Main Thumbnail</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D3436] hover:bg-stone-100 shadow-2xs transition-colors truncate"
                            >
                              {coverPreviewUrl && !removeCover ? 'Change' : 'Upload'}
                            </button>
                            {coverPreviewUrl && !removeCover && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRemoveCover(true);
                                  setCoverPreviewUrl(null);
                                  setSelectedCover(null);
                                  if (coverInputRef.current) coverInputRef.current.value = '';
                                }}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                title="Remove Cover"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Slot 2: Inside Page Preview 1 */}
                        <div className="border border-stone-200 rounded-2xl p-3 bg-stone-50/80 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#2D3436]">2. Inside Page 1</span>
                              <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                                Sample Page
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 mb-2">
                              Slide 2: Sample diagram, notes, or index
                            </p>

                            <input
                              id="note-form-preview1-file"
                              type="file"
                              accept="image/*"
                              ref={preview1InputRef}
                              onChange={handlePreview1Change}
                              className="hidden"
                            />

                            <div className="relative h-36 w-full rounded-xl bg-stone-950 border border-stone-200 overflow-hidden flex items-center justify-center mb-2.5 p-1">
                              {preview1Url && !removePreview1 ? (
                                <img
                                  src={preview1Url}
                                  alt="Inside Preview 1"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="text-center p-2 text-stone-400">
                                  <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                  <span className="text-[10px] block font-medium">Inside Page 1</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => preview1InputRef.current?.click()}
                              className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D3436] hover:bg-stone-100 shadow-2xs transition-colors truncate"
                            >
                              {preview1Url && !removePreview1 ? 'Change' : 'Upload'}
                            </button>
                            {preview1Url && !removePreview1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRemovePreview1(true);
                                  setPreview1Url(null);
                                  setSelectedPreview1(null);
                                  if (preview1InputRef.current) preview1InputRef.current.value = '';
                                }}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                title="Remove Preview 1"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Slot 3: Inside Page Preview 2 */}
                        <div className="border border-stone-200 rounded-2xl p-3 bg-stone-50/80 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-[#2D3436]">3. Inside Page 2</span>
                              <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-1.5 py-0.5 rounded">
                                Sample Page
                              </span>
                            </div>
                            <p className="text-[10px] text-stone-500 mb-2">
                              Slide 3: High-yield summary or chart
                            </p>

                            <input
                              id="note-form-preview2-file"
                              type="file"
                              accept="image/*"
                              ref={preview2InputRef}
                              onChange={handlePreview2Change}
                              className="hidden"
                            />

                            <div className="relative h-36 w-full rounded-xl bg-stone-950 border border-stone-200 overflow-hidden flex items-center justify-center mb-2.5 p-1">
                              {preview2Url && !removePreview2 ? (
                                <img
                                  src={preview2Url}
                                  alt="Inside Preview 2"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="text-center p-2 text-stone-400">
                                  <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                  <span className="text-[10px] block font-medium">Inside Page 2</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => preview2InputRef.current?.click()}
                              className="flex-1 py-1.5 px-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#2D3436] hover:bg-stone-100 shadow-2xs transition-colors truncate"
                            >
                              {preview2Url && !removePreview2 ? 'Change' : 'Upload'}
                            </button>
                            {preview2Url && !removePreview2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRemovePreview2(true);
                                  setPreview2Url(null);
                                  setSelectedPreview2(null);
                                  if (preview2InputRef.current) preview2InputRef.current.value = '';
                                }}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                title="Remove Preview 2"
                              >
                                Remove
                              </button>
                            )}
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5C715E] text-white rounded-lg text-xs font-bold shadow-2xs hover:bg-[#4A5D4E] cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add New Note</span>
                    </button>
                  </div>

                  {manageNotification && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                        manageNotification.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {manageNotification.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{manageNotification.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManageNotification(null)}
                        className="text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

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
                              <div className="w-16 sm:w-20 h-14 rounded-xl overflow-hidden border border-stone-200 bg-stone-950 shrink-0 flex items-center justify-center p-1">
                                <img
                                  src={note.cover_image}
                                  alt={note.title}
                                  referrerPolicy="no-referrer"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-16 sm:w-20 h-14 rounded-xl bg-[#D9E4DD] text-[#5C715E] flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
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
                                {Array.isArray(note.preview_images) && note.preview_images.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    +{note.preview_images.length} Inside Previews
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-[#2D3436]">₹{note.price}</span>
                                <span>•</span>
                                <span>{note.pdf_original_name || 'PDF uploaded'}</span>
                                {note.pdf_size && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {note.pdf_size >= 1024 * 1024 * 1024
                                        ? (note.pdf_size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                                        : (note.pdf_size / (1024 * 1024)).toFixed(1) + ' MB'}
                                    </span>
                                  </>
                                )}
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
                              onClick={() => handlePromptDelete(note)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-[#2D3436]">Student Orders & Purchases</h4>
                      <p className="text-xs text-stone-500">
                        Real-time verified student purchases and access logs
                      </p>
                    </div>
                    {adminOrders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowClearOrdersModal(true)}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100/60 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Clear all sales history"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Clear All Sales</span>
                      </button>
                    )}
                  </div>

                  {orderNotification && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                        orderNotification.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {orderNotification.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{orderNotification.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderNotification(null)}
                        className="text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

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
                    <div className="space-y-4">
                      {/* Pending Verification Notice & Actions */}
                      {(() => {
                        const pendingOrders = adminOrders.filter((o) => o.status === 'pending_verification');
                        if (pendingOrders.length === 0) return null;
                        return (
                          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 shadow-sm">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                              <span>{pendingOrders.length} Payment Verification Request(s) Awaiting Your Action</span>
                            </div>
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Students have submitted UPI transfers for the notes below. Check your UPI / Bank app (GPay / PhonePe / Paytm for <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono font-bold text-amber-900">{settingsUpiId || profile.upi_id || 'your registered UPI ID'}</code>) to verify the credit, then click <strong>Approve & Unlock PDF</strong>.
                            </p>

                            <div className="space-y-2">
                              {pendingOrders.map((pOrder) => (
                                <div
                                  key={pOrder.id}
                                  className="p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs"
                                >
                                  <div>
                                    <div className="font-bold text-[#2D3436] text-xs flex items-center gap-2">
                                      <span>{pOrder.customer_name}</span>
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-mono font-bold">
                                        ₹{pOrder.amount}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-stone-600 mt-0.5">
                                      <strong>Note:</strong> {pOrder.note_title}
                                    </div>
                                    <div className="text-[11px] text-stone-500">
                                      <span>{pOrder.customer_email}</span>
                                      {pOrder.customer_phone && <span> • +91 {pOrder.customer_phone}</span>}
                                    </div>
                                    <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                                      Order: {pOrder.id}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                      type="button"
                                      disabled={processingOrderId === pOrder.id}
                                      onClick={() => handleApproveOrder(pOrder.id)}
                                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{processingOrderId === pOrder.id ? 'Processing...' : 'Approve & Unlock PDF'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={processingOrderId === pOrder.id}
                                      onClick={() => handleRejectOrder(pOrder.id)}
                                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>{processingOrderId === pOrder.id ? 'Rejecting...' : 'Reject'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOrderToDelete(pOrder)}
                                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                      title="Delete order record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Full Orders History */}
                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden text-xs bg-white">
                        {adminOrders.map((order) => (
                          <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between gap-3 hover:bg-stone-50/80 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#2D3436] text-sm">
                                  {order.customer_name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    order.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : order.status === 'pending_verification'
                                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                                      : order.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {order.status === 'paid'
                                    ? 'Paid & Verified'
                                    : order.status === 'pending_verification'
                                    ? 'Pending Verification'
                                    : order.status === 'rejected'
                                    ? 'Rejected'
                                    : order.status}
                                </span>
                                {order.payment_method && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 uppercase">
                                    {order.payment_method}
                                  </span>
                                )}
                              </div>

                              <div className="text-stone-600">
                                <strong>Note:</strong> {order.note_title} • <strong>Amount:</strong> ₹{order.amount}
                              </div>
                              <div className="text-stone-500">
                                <span>{order.customer_email}</span>
                                {order.customer_phone && <span> • +91 {order.customer_phone}</span>}
                              </div>
                              <div className="text-[11px] font-mono text-stone-400">
                                Order ID: {order.id}
                              </div>

                              {order.download_token && order.status === 'paid' && (
                                <div className="flex items-center gap-2 pt-1">
                                  <a
                                    href={`/api/view/${order.download_token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-[#5C715E] hover:underline"
                                  >
                                    Preview Student PDF ↗
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

                               {order.status === 'pending_verification' && (
                                <div className="flex items-center gap-2 pt-2">
                                  <button
                                    type="button"
                                    disabled={processingOrderId === order.id}
                                    onClick={() => handleApproveOrder(order.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{processingOrderId === order.id ? 'Processing...' : 'Approve & Unlock PDF'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingOrderId === order.id}
                                    onClick={() => handleRejectOrder(order.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>{processingOrderId === order.id ? 'Rejecting...' : 'Reject'}</span>
                                  </button>
                                </div>
                              )}

                              {order.status === 'rejected' && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveOrder(order.id)}
                                    className="text-[11px] font-bold text-[#5C715E] hover:underline cursor-pointer"
                                  >
                                    Re-approve & Unlock PDF
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end justify-between gap-2.5 text-right self-start sm:self-center shrink-0">
                              <div className="text-stone-400">
                                <div>{new Date(order.created_at).toLocaleDateString()}</div>
                                <div className="text-[11px] text-stone-500">
                                  Downloads: {order.download_count || 0}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setOrderToDelete(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="Delete this order record"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

                    {/* Section 2: Direct UPI & Dynamic QR Settings */}
                    <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#5C715E]/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-[#2D3436] uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#5C715E]" />
                          <span>Direct UPI & Dynamic QR Payments</span>
                        </h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D9E4DD] text-[#2D3436]">
                          0% Gateway Fee
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Your UPI ID (VPA) <span className="text-[#5C715E] font-semibold">*Permanently Saved</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 8340749923@paytm or yourname@okhdfcbank"
                          value={settingsUpiId}
                          onChange={(e) => setSettingsUpiId(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                          required
                        />
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                          Students scan the real-time dynamic QR code generated specifically for each note or tap "Pay with UPI App" on their phone. All payments deposit directly to your bank account with zero gateway commissions or third-party hold.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="w-full py-3.5 bg-[#5C715E] hover:bg-[#4A5D4E] text-white rounded-xl font-bold text-sm shadow-md shadow-[#5C715E]/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {settingsSaving ? 'Saving Profile & UPI ID...' : 'Save Profile & UPI Settings'}
                    </button>
                  </form>

                  {/* Section 3: Dedicated Security PIN Management */}
                  <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 mt-6">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h5 className="text-xs font-bold text-[#2D3436] uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#5C715E]" />
                          <span>Change Security PIN</span>
                        </h5>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Replace the default PIN (1234) with your own private security code
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Admin Security
                      </span>
                    </div>

                    {pinChangeMessage && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium ${
                          pinChangeMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {pinChangeMessage.text}
                      </div>
                    )}

                    <form onSubmit={handleChangePin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Current Security PIN <span className="text-stone-400 font-normal">(Default is 1234 if not changed)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Enter current PIN (e.g. 1234)"
                          value={currentPinInput}
                          onChange={(e) => setCurrentPinInput(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            New Security PIN <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="At least 4 digits"
                            value={newPinInput}
                            onChange={(e) => setNewPinInput(e.target.value)}
                            required
                            minLength={4}
                            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Confirm New PIN <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            placeholder="Re-enter new PIN"
                            value={confirmPinInput}
                            onChange={(e) => setConfirmPinInput(e.target.value)}
                            required
                            minLength={4}
                            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5C715E] bg-white"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={pinChangeLoading}
                        className="w-full py-2.5 bg-[#2D3436] hover:bg-black text-white rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {pinChangeLoading ? 'Updating PIN...' : 'Save New Security PIN Permanently'}
                      </button>
                    </form>
                  </div>
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
                    {/* Step 1: Instant Direct UPI & Dynamic QR */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                          1. Direct UPI & Instant QR Setup (Zero Gateway Commissions)
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          0% Fee • Direct Bank Settlement
                        </span>
                      </div>
                      <p>
                        No third-party payment gateways or deductions needed. Enter your UPI ID (e.g., <code className="bg-white px-1 rounded font-mono border">8340749923@paytm</code> or <code className="bg-white px-1 rounded font-mono border">kamranalam8340749923-1@okhdfcbank</code>) in the <strong>Settings</strong> tab.
                      </p>
                      <p className="text-stone-600">
                        When students purchase, a custom dynamic QR code is generated for that specific note and amount. When scanned with any UPI app (GPay, PhonePe, Paytm, BHIM), 100% of the money deposits straight into your bank account.
                      </p>
                    </div>

                    {/* Step 2: High Security Payment Verification */}
                    <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-[#2D3436] text-xs uppercase tracking-wider">
                          2. Bank Transfer Verification & Access Unlock
                        </h5>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          100% Secure Access Control
                        </span>
                      </div>
                      <p>
                        To protect your study materials from unauthorized downloads:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1">
                        <li>The student submits their valid email, name, and 12-digit UPI reference number.</li>
                        <li>Check your UPI or banking app to confirm the credit.</li>
                        <li>Open the <strong>Orders tab</strong> in this Admin Panel and click <strong>Approve & Unlock PDF</strong>.</li>
                        <li>The student's access is instantly unlocked and they can download or read online. Unverified requests never get access.</li>
                      </ol>
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
        {/* In-App Note Deletion Confirmation Modal */}
        {noteToDelete && (
          <div 
            id="delete-note-modal"
            className="fixed inset-0 z-[70] overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-[#2D3436]">Delete Note Permanently?</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to delete this study note? Its uploaded PDF file and preview images will also be removed from storage. This cannot be undone.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1.5">
                <div className="font-bold text-xs sm:text-sm text-[#2D3436] line-clamp-2">
                  {noteToDelete.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="font-extrabold text-[#5C715E]">₹{noteToDelete.price}</span>
                  <span>•</span>
                  <span className="truncate">{noteToDelete.pdf_original_name || 'PDF uploaded'}</span>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingNote}
                  onClick={() => {
                    setNoteToDelete(null);
                    setDeleteError(null);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-note-btn"
                  disabled={isDeletingNote}
                  onClick={handleConfirmDelete}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingNote ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* In-App Delete Order Confirmation Modal */}
        {orderToDelete && (
          <div
            id="delete-order-modal"
            className="fixed inset-0 z-[70] overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#2D3436]">Delete Sales Record?</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to permanently delete order <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">{orderToDelete.id}</code> for <strong>{orderToDelete.customer_name}</strong>?
                </p>
                <p className="text-[11px] text-stone-500">
                  Note: {orderToDelete.note_title} • ₹{orderToDelete.amount}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingOrder}
                  onClick={() => setOrderToDelete(null)}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingOrder}
                  onClick={handleConfirmDeleteOrder}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingOrder ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* In-App Clear All Sales History Modal */}
        {showClearOrdersModal && (
          <div
            id="clear-all-orders-modal"
            className="fixed inset-0 z-[70] overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#2D3436]">Clear All Sales History?</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  This will permanently delete all <strong>{adminOrders.length}</strong> recorded orders and reset your sales metrics. This action cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isClearingOrders}
                  onClick={() => setShowClearOrdersModal(false)}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isClearingOrders}
                  onClick={handleConfirmClearAllOrders}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isClearingOrders ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Clearing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Clear All</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
