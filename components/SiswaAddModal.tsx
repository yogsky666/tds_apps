import React, { useState, useEffect } from 'react';
import { Siswa, Kelas, User } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface SiswaAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (relasi: Siswa) => Promise<void>;
  kelasList: Kelas[];
  unassignedStudents: User[];
  error?: string | null;
}

const SiswaAddModal: React.FC<SiswaAddModalProps> = ({ isOpen, onClose, onSave, kelasList, unassignedStudents, error }) => {
  const [selectedNipd, setSelectedNipd] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedNipd('');
      setSelectedKelasId('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNipd === '' || selectedKelasId === '') return;
    
    setIsSaving(true);
    const dataToSave: Siswa = {
        nipd: selectedNipd,
        id_kelas: Number(selectedKelasId),
    };
    // The onSave function from the parent might throw an error, which we want to let it handle
    try {
        await onSave(dataToSave);
    } finally {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

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
          Tambah Siswa ke Kelas
        </h2>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nipd" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Siswa</label>
            <select
              name="nipd"
              id="nipd"
              value={selectedNipd}
              onChange={(e) => setSelectedNipd(e.target.value)}
              required
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value="" disabled>-- Siswa Belum Punya Kelas --</option>
                {unassignedStudents.length > 0 ? (
                    unassignedStudents.map(siswa => (
                        <option key={siswa.username} value={siswa.username}>
                            {siswa.nama} ({siswa.username})
                        </option>
                    ))
                ) : (
                    <option disabled>Tidak ada siswa yang belum ditugaskan</option>
                )}
            </select>
          </div>
          <div>
            <label htmlFor="id_kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pilih Kelas</label>
            <select
              name="id_kelas"
              id="id_kelas"
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(Number(e.target.value))}
              required
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
                <option value="" disabled>-- Pilih Kelas Tujuan --</option>
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
            <button type="submit" disabled={isSaving || unassignedStudents.length === 0} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiswaAddModal;