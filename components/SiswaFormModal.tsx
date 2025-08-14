import React, { useState, useEffect } from 'react';
import { Siswa, Kelas, User } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { Avatar } from './Avatar';

interface SiswaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (relasi: Siswa) => Promise<void>;
  initialData: {
      user: User;
      relasi: Siswa;
  } | null;
  kelasList: Kelas[];
  error?: string | null;
}

const SiswaFormModal: React.FC<SiswaFormModalProps> = ({ isOpen, onClose, onSave, initialData, kelasList, error }) => {
  const [selectedKelasId, setSelectedKelasId] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setSelectedKelasId(initialData.relasi.id_kelas || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData || selectedKelasId === '') return;
    
    setIsSaving(true);
    const dataToSave: Siswa = {
        nipd: initialData.relasi.nipd,
        id_kelas: Number(selectedKelasId),
    };
    await onSave(dataToSave);
    setIsSaving(false);
  };

  if (!isOpen || !initialData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg p-6 mx-auto bg-white rounded-2xl shadow-xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 bg-transparent rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Edit Kelas Siswa
        </h2>

        <div className="flex items-center p-4 my-4 bg-gray-100 rounded-lg dark:bg-gray-700/50">
            <Avatar user={initialData.user} className="w-12 h-12 rounded-full"/>
            <div className="ml-4">
                <p className="font-semibold text-gray-900 dark:text-white">{initialData.user.nama}</p>
                <p className="text-sm text-gray-500 font-mono dark:text-gray-400">{initialData.user.username}</p>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="id_kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pindahkan ke Kelas</label>
            <select
              name="id_kelas"
              id="id_kelas"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(Number(e.target.value))}
              required
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value="" disabled>-- Pilih Kelas --</option>
                {kelasList.map(kelas => (
                    <option key={kelas.id} value={kelas.id}>
                        {kelas.kelas}
                    </option>
                ))}
            </select>
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          
          <div className="pt-4 space-x-3 text-right">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              Batal
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800">
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiswaFormModal;