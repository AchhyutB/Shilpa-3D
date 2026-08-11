
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Pencil, Upload, Trash2, X, AlertTriangle, Check } from 'lucide-react';
import Header from '@/components/shared/header';


const LANGUAGES = ['English', 'Nepali', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];
const COUNTRIES = ['United States', 'Nepal', 'India', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'Japan', 'Other'];
const QUALITIES = ['Low', 'Standard', 'High'];
const RECONSTRUCTIONS = ['Gaussian Splat', 'NeRF'];

const DEFAULT_PROFILE = {
  avatar: null,
  name: 'Morty Smith',
  language: 'English',
  country: 'United States',
  quality: 'Standard',
  reconstruction: 'Gaussian Splat',
};

function FieldLabel({ children }) {
  return (
    <label className="text-sm text-[#6E6258] font-medium font-mono block mb-2">
      {children}
    </label>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border-2 border-[#E3D5C7] h-12 px-5 pr-10 rounded-xl text-[#1F0F0B] font-mono text-sm cursor-pointer focus:outline-none focus:border-[#D89A4A] transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6258]"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ModalShell({ onClose, children, width = 'max-w-sm' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F0F0B]/60 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} bg-[#F6EFE8] border border-[#E3D5C7] rounded-2xl p-6 relative`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function AvatarUploadModal({ currentAvatar, onClose, onSave }) {
  const [preview, setPreview] = useState(currentAvatar);
  const [zoom, setZoom] = useState(1);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell onClose={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[#6E6258] hover:text-[#1F0F0B] transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-serif text-[#1F0F0B] mb-1">Update photo</h2>
      <p className="text-xs font-mono text-[#6E6258] mb-6">Fits and crops to a circle automatically.</p>

      <div className="flex flex-col items-center gap-5">
        <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-[#E3D5C7] bg-white flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <span className="text-4xl font-serif text-[#D89A4A]">D</span>
          )}
        </div>

        {preview && (
          <div className="w-full">
            <label className="text-[11px] font-mono text-[#6E6258] block mb-1">Zoom</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#D89A4A]"
            />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full h-12 rounded-full font-serif bg-white border-2 border-[#E3D5C7] text-[#1F0F0B] hover:bg-[#F6EFE8] flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {preview ? 'Choose a different photo' : 'Choose a photo'}
        </Button>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          onClick={onClose}
          className="flex-1 h-12 rounded-full font-serif bg-transparent border-2 border-[#E3D5C7] text-[#1F0F0B] hover:bg-white"
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!preview}
          onClick={() => onSave(preview, zoom)}
          className={`flex-1 h-12 rounded-full font-serif ${
            preview
              ? 'bg-[#D89A4A] text-[#1F0F0B] hover:bg-[#D89A4A]/90'
              : 'bg-[#D89A4A]/50 text-[#1F0F0B]/60 cursor-not-allowed'
          }`}
        >
          Save photo
        </Button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ title, description, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} width="max-w-md">
      <div className="flex items-start gap-3 mb-2">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-[#B8463B]/10' : 'bg-[#D89A4A]/15'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-[#B8463B]' : 'text-[#D89A4A]'}`} />
        </div>
        <div>
          <h2 className="text-xl font-serif text-[#1F0F0B]">{title}</h2>
          <p className="text-sm font-mono text-[#6E6258] mt-1">{description}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-full font-serif bg-transparent border-2 border-[#E3D5C7] text-[#1F0F0B] hover:bg-white"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          className={`flex-1 h-12 rounded-full font-serif ${
            danger
              ? 'bg-[#B8463B] text-white hover:bg-[#B8463B]/90'
              : 'bg-[#D89A4A] text-[#1F0F0B] hover:bg-[#D89A4A]/90'
          }`}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

export default function AccountSettingsPage({ onLogout }) {
  const navigate = useNavigate();

  const [saved, setSaved] = useState(DEFAULT_PROFILE);
  const [form, setForm] = useState(DEFAULT_PROFILE);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef(null);

  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(form);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSaveChanges = () => {
    setSaved(form);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  const handleCancel = () => {
    setForm(saved);
    setEditingName(false);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    onLogout?.();
    navigate('/');
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F6EFE8]">
      <Header onLogout={onLogout} />

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full max-w-2xl mx-auto px-6 pt-24 pb-6 flex flex-col justify-center overflow-hidden"
      >
        <h1 className="text-3xl font-serif text-[#1F0F0B] mb-6">Account Settings</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#E3D5C7] bg-linear-to-br from-[#4E9DDE] via-[#1F0F0B] to-[#4EDE8E] flex items-center justify-center shrink-0">
            {form.avatar ? (
              <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-serif text-white">{form.name.charAt(0) || '?'}</span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            className="h-10 px-5 rounded-full font-serif text-sm bg-white border-2 border-[#E3D5C7] text-[#1F0F0B] hover:bg-[#F6EFE8]"
          >
            Update
          </Button>
          <button
            type="button"
            disabled={!form.avatar}
            onClick={() => setShowRemoveConfirm(true)}
            className={`flex items-center gap-1.5 text-sm font-mono ${
              form.avatar ? 'text-[#6E6258] hover:text-[#B8463B] cursor-pointer' : 'text-[#6E6258]/40 cursor-not-allowed'
            } transition-colors`}
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>

        <div className="mb-6">
          <FieldLabel>Name</FieldLabel>
          {editingName ? (
            <Input
              ref={nameInputRef}
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="bg-white! border-2 border-[#D89A4A] h-14 px-5 rounded-xl text-[#1F0F0B] font-mono"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="w-full h-14 px-5 rounded-xl bg-white border-2 border-[#E3D5C7] flex items-center justify-between text-left text-[#1F0F0B] font-mono hover:border-[#D89A4A] transition-colors"
            >
              <span>{form.name || 'Add your name'}</span>
              <Pencil className="w-4 h-4 text-[#6E6258]" />
            </button>
          )}
        </div>

        <div className="mb-6">
          <FieldLabel>Language</FieldLabel>
          <SelectField value={form.language} onChange={(v) => update('language', v)} options={LANGUAGES} />
        </div>

        <div className="mb-6">
          <FieldLabel>Country</FieldLabel>
          <SelectField value={form.country} onChange={(v) => update('country', v)} options={COUNTRIES} />
        </div>

        <div className="grid grid-cols-2 gap-5 mb-12">
          <div>
            <FieldLabel>Standard Quality</FieldLabel>
            <SelectField value={form.quality} onChange={(v) => update('quality', v)} options={QUALITIES} />
          </div>
          <div>
            <FieldLabel>Default Reconstruction</FieldLabel>
            <SelectField value={form.reconstruction} onChange={(v) => update('reconstruction', v)} options={RECONSTRUCTIONS} />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={!isDirty}
              onClick={handleSaveChanges}
              className={`h-12 px-8 rounded-full font-serif ${
                isDirty
                  ? 'bg-[#D89A4A] text-[#1F0F0B] hover:bg-[#D89A4A]/90 cursor-pointer'
                  : 'bg-[#D89A4A]/50 text-[#1F0F0B]/60 cursor-not-allowed'
              }`}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              disabled={!isDirty}
              onClick={handleCancel}
              className={`h-12 px-8 rounded-full font-serif bg-transparent border-2 ${
                isDirty
                  ? 'border-[#E3D5C7] text-[#1F0F0B] hover:bg-white cursor-pointer'
                  : 'border-[#E3D5C7]/50 text-[#1F0F0B]/40 cursor-not-allowed'
              }`}
            >
              Cancel
            </Button>
          </div>

          <Button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-12 px-8 rounded-full font-serif bg-[#B8463B] text-white hover:bg-[#B8463B]/90"
          >
            Delete Account
          </Button>
        </div>
      </motion.main>

      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1F0F0B] text-[#F6EFE8] font-mono text-sm px-5 py-3 rounded-full flex items-center gap-2 shadow-lg"
          >
            <Check className="w-4 h-4 text-[#D89A4A]" />
            Changes saved
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAvatarModal && (
          <AvatarUploadModal
            currentAvatar={form.avatar}
            onClose={() => setShowAvatarModal(false)}
            onSave={(preview) => {
              update('avatar', preview);
              setShowAvatarModal(false);
            }}
          />
        )}

        {showRemoveConfirm && (
          <ConfirmModal
            title="Remove profile photo?"
            description="You can always upload a new one later."
            confirmLabel="Remove"
            danger
            onCancel={() => setShowRemoveConfirm(false)}
            onConfirm={() => {
              update('avatar', null);
              setShowRemoveConfirm(false);
            }}
          />
        )}

        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete your account?"
            description="This permanently removes your account and all your reconstructions. This can't be undone."
            confirmLabel="Delete account"
            danger
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteAccount}
          />
        )}
      </AnimatePresence>
    </div>
  );
}