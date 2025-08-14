import React, { useState, useEffect } from 'react';
import { Sanksi, JenisSanksi } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface SanksiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sanksi: Omit<Sanksi, 'id'> | Sanksi) => Promise<void>;
  initialData: Sanksi | null;
  error?: string | null;
}

const SanksiFormModal: React.FC<SanksiFormModalProps> = ({ isOpen, onClose, onSave, initialData, error }) => {
  const [formData, setFormData] = useState<Omit<Sanksi, 'id'>>({
    desk_kesalahan: '',
    jenis_sanksi: JenisSanksi.RINGAN,
    point_pelanggar: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        desk_kesalahan: initialData.desk_kesalahan,
        jenis_sanksi: initialData.jenis_sanksi,
        point_pelanggar: initialData.point_pelanggar,
      });
    } else if (isOpen && !initialData) {
      setFormData({
        desk_kesalahan: '',
        jenis_sanksi: JenisSanksi.RINGAN,
        point_pelanggar: 0,
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? parseInt(value, 10) || 0 : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const dataToSave = initialData ? { ...formData, id: initialData.id } : formData;
    await onSave(dataToSave);
    setIsSaving(false);
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
          {isEditMode ? 'Edit Sanksi' : 'Tambah Sanksi Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="desk_kesalahan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Kesalahan</label>
            <textarea
              name="desk_kesalahan"
              id="desk_kesalahan"
              value={formData.desk_kesalahan}
              onChange={handleChange}
              required
              rows={3}
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Contoh: Terlambat masuk sekolah lebih dari 15 menit"
            />
          </div>
          <div>
            <label htmlFor="jenis_sanksi" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Sanksi</label>
            <select
              name="jenis_sanksi"
              id="jenis_sanksi"
              value={formData.jenis_sanksi}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={JenisSanksi.RINGAN}>Ringan</option>
              <option value={JenisSanksi.SEDANG}>Sedang</option>
              <option value={JenisSanksi.BERAT}>Berat</option>
            </select>
          </div>
          <div>
            <label htmlFor="point_pelanggar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poin Pelanggar</label>
            <input
              type="number"
              name="point_pelanggar"
              id="point_pelanggar"
              value={formData.point_pelanggar}
              onChange={handleChange}
              required
              min="0"
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Contoh: 10"
            />
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          
          <div className="pt-4 space-x-3 text-right">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              Batal
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SanksiFormModal;