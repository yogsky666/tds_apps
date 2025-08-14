
import React, { useState, useEffect } from 'react';
import { User, Role, Gender } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { useAuth } from '../hooks/useAuth';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => Promise<void>;
  initialData: User | null;
  error?: string | null;
  defaultRole?: Role;
  currentUserRole?: Role;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, initialData, error, defaultRole, currentUserRole }) => {
  const [formData, setFormData] = useState<Omit<User, 'photo'>>({
    nama: '',
    username: '',
    jenis_kelamin: Gender.MALE,
    role: defaultRole || Role.SISWA,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
          nama: initialData.nama,
          username: initialData.username,
          jenis_kelamin: initialData.jenis_kelamin,
          role: initialData.role,
      });
    } else if (isOpen && !initialData) {
      // Reset form for new user
      setFormData({
        nama: '',
        username: '',
        jenis_kelamin: Gender.MALE,
        role: defaultRole || Role.SISWA,
      });
    }
  }, [isOpen, initialData, defaultRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const userToSave: User = {
        ...formData,
        photo: initialData?.photo, // Preserve photo on edit
    };
    await onSave(userToSave);
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      aria-labelledby="form-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg p-6 mx-auto bg-white rounded-2xl shadow-xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 bg-transparent rounded-full hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 id="form-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEditMode ? 'Perbarui informasi pengguna di bawah ini.' : 'Isi detail untuk pengguna baru.'}
        </p>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nama" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
            <input
              type="text"
              name="nama"
              id="nama"
              value={formData.nama}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username (NIP/NIK/NISN)</label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isEditMode}
              className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm read-only:bg-gray-200 dark:read-only:bg-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          {!isEditMode && (
             <p className="text-xs text-gray-500 dark:text-gray-400">
                Kata sandi default untuk pengguna baru adalah "password". Pengguna dapat meresetnya nanti.
            </p>
          )}
          <div>
            <label htmlFor="jenis_kelamin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Kelamin</label>
            <select
              name="jenis_kelamin"
              id="jenis_kelamin"
              value={formData.jenis_kelamin}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={Gender.MALE}>Laki-laki</option>
              <option value={Gender.FEMALE}>Perempuan</option>
            </select>
          </div>
           <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select
              name="role"
              id="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isEditMode || !!defaultRole}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={Role.SISWA}>Siswa</option>
              <option value={Role.GURU}>Guru</option>
              <option value={Role.TDS}>TDS</option>
              <option value={Role.ADMIN}>Admin</option>
              {currentUserRole === Role.SUPER_ADMIN && (
                <option value={Role.SUPER_ADMIN}>Super Admin</option>
              )}
            </select>
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          
          <div className="pt-4 space-x-3 text-right">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;