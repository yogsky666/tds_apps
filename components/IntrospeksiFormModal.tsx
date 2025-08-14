import React, { useState, useEffect } from 'react';
import { Introspeksi, JenisPerbaikan } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface IntrospeksiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Introspeksi, 'id'> | Introspeksi) => Promise<void>;
  initialData: Introspeksi | null;
  error?: string | null;
}

const IntrospeksiFormModal: React.FC<IntrospeksiFormModalProps> = ({ isOpen, onClose, onSave, initialData, error }) => {
  const [formData, setFormData] = useState<Omit<Introspeksi, 'id'>>({
    desk_perbaikan: '',
    jenis_perbaikan: JenisPerbaikan.MUDAH,
    point_perbaikan: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        desk_perbaikan: initialData.desk_perbaikan,
        jenis_perbaikan: initialData.jenis_perbaikan,
        point_perbaikan: initialData.point_perbaikan,
      });
    } else if (isOpen && !initialData) {
      setFormData({
        desk_perbaikan: '',
        jenis_perbaikan: JenisPerbaikan.MUDAH,
        point_perbaikan: 0,
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
          {isEditMode ? 'Edit Introspeksi' : 'Tambah Introspeksi Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="desk_perbaikan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deskripsi Perbaikan</label>
            <textarea
              name="desk_perbaikan"
              id="desk_perbaikan"
              value={formData.desk_perbaikan}
              onChange={handleChange}
              required
              rows={3}
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Contoh: Membantu teman yang kesulitan belajar"
            />
          </div>
          <div>
            <label htmlFor="jenis_perbaikan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jenis Perbaikan</label>
            <select
              name="jenis_perbaikan"
              id="jenis_perbaikan"
              value={formData.jenis_perbaikan}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={JenisPerbaikan.MUDAH}>Mudah</option>
              <option value={JenisPerbaikan.CUKUP}>Cukup</option>
              <option value={JenisPerbaikan.SULIT}>Sulit</option>
            </select>
          </div>
          <div>
            <label htmlFor="point_perbaikan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poin Perbaikan</label>
            <input
              type="number"
              name="point_perbaikan"
              id="point_perbaikan"
              value={formData.point_perbaikan}
              onChange={handleChange}
              required
              min="0"
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Contoh: 15"
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

export default IntrospeksiFormModal;
