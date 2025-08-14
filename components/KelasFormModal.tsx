import React, { useState, useEffect } from 'react';
import { Kelas, Tingkat, User } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface KelasFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kelas: Omit<Kelas, 'id'> | Kelas) => Promise<void>;
  initialData: Kelas | null;
  guruList: User[];
  error?: string | null;
}

const KelasFormModal: React.FC<KelasFormModalProps> = ({ isOpen, onClose, onSave, initialData, guruList, error }) => {
  const [formData, setFormData] = useState<Omit<Kelas, 'id'>>({
    kelas: '',
    tingkat: Tingkat.X,
    id_guru: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        kelas: initialData.kelas,
        tingkat: initialData.tingkat,
        id_guru: initialData.id_guru,
      });
    } else if (isOpen && !initialData) {
      setFormData({
        kelas: '',
        tingkat: Tingkat.X,
        id_guru: null,
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
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
          {isEditMode ? 'Edit Kelas' : 'Tambah Kelas Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="kelas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Kelas</label>
            <input
              type="text"
              name="kelas"
              id="kelas"
              value={formData.kelas}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Contoh: X IPA 1"
            />
          </div>
          <div>
            <label htmlFor="tingkat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkat</label>
            <select
              name="tingkat"
              id="tingkat"
              value={formData.tingkat}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={Tingkat.X}>X</option>
              <option value={Tingkat.XI}>XI</option>
              <option value={Tingkat.XII}>XII</option>
            </select>
          </div>
          <div>
            <label htmlFor="id_guru" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Wali Kelas</label>
            <select
              name="id_guru"
              id="id_guru"
              value={formData.id_guru || 'null'}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="null">-- Tidak Ada --</option>
              {guruList.map(guru => (
                <option key={guru.username} value={guru.username}>
                  {guru.nama}
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
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KelasFormModal;
