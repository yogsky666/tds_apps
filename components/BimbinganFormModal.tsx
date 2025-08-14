
import React, { useState, useEffect, useMemo } from 'react';
import { Bimbingan, User, Introspeksi, Role, JenisPerbaikan } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';

interface BimbinganFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Bimbingan, 'id'> | Bimbingan) => Promise<void>;
  initialData: {
      bimbingan: Bimbingan;
      siswa: User;
      perbaikan: Introspeksi;
  } | null;
  error?: string | null;
}

const BimbinganFormModal: React.FC<BimbinganFormModalProps> = ({ isOpen, onClose, onSave, initialData, error: parentError }) => {
  const { users, introspeksi } = useAuth();
  
  const [formData, setFormData] = useState<Omit<Bimbingan, 'id' | 'id_perbaikan'> & { id_perbaikan: number | '' }>({
    nipd: '',
    id_perbaikan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [nipdInput, setNipdInput] = useState('');
  const [validatedSiswa, setValidatedSiswa] = useState<User | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [perbaikanSearchTerm, setPerbaikanSearchTerm] = useState('');
  
  const isEditMode = !!initialData;
  const userMap = useMemo(() => new Map(users.map(u => [u.username, u])), [users]);

  useEffect(() => {
    setValidationError(null);
    setValidatedSiswa(null);
    setPerbaikanSearchTerm('');

    if (isOpen) {
        if (initialData) {
            const student = userMap.get(initialData.bimbingan.nipd);
            setNipdInput(initialData.bimbingan.nipd);
            if(student) setValidatedSiswa(student);

            setFormData({
                nipd: initialData.bimbingan.nipd,
                id_perbaikan: initialData.bimbingan.id_perbaikan,
                tanggal: initialData.bimbingan.tanggal,
            });
        } else {
            // Reset for new entry
            setNipdInput('');
            setFormData({
                nipd: '',
                id_perbaikan: '',
                tanggal: new Date().toISOString().split('T')[0],
            });
        }
    }
  }, [isOpen, initialData, userMap]);

  const handleNipdValidation = () => {
    if (!nipdInput) {
        setValidationError('NIPD tidak boleh kosong.');
        setValidatedSiswa(null);
        return;
    }
    const foundUser = userMap.get(nipdInput);
    if (foundUser && foundUser.role === Role.SISWA) {
        setValidatedSiswa(foundUser);
        setFormData(prev => ({ ...prev, nipd: foundUser.username }));
        setValidationError(null);
    } else {
        setValidatedSiswa(null);
        setFormData(prev => ({ ...prev, nipd: '' }));
        setValidationError('Siswa dengan NIPD tersebut tidak ditemukan.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nipd || !formData.id_perbaikan) {
        setValidationError("Pastikan siswa sudah divalidasi dan perbaikan sudah dipilih.");
        return;
    }
    setIsSaving(true);
    const dataToSubmit: Omit<Bimbingan, 'id'> = {
        ...formData,
        id_perbaikan: Number(formData.id_perbaikan),
    };

    const dataToSave = initialData ? { ...dataToSubmit, id: initialData.bimbingan.id } : dataToSubmit;
    await onSave(dataToSave);
    setIsSaving(false);
  };

  const groupedPerbaikan = useMemo(() => {
    const filtered = introspeksi.filter(i => 
        i.desk_perbaikan.toLowerCase().includes(perbaikanSearchTerm.toLowerCase())
    );
    return filtered.reduce((acc, curr) => {
        const group = curr.jenis_perbaikan;
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(curr);
        return acc;
    }, {} as Record<JenisPerbaikan, Introspeksi[]>);
  }, [introspeksi, perbaikanSearchTerm]);

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
          {isEditMode ? 'Edit Bimbingan' : 'Tambah Bimbingan Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nipd-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIPD Siswa</label>
            <div className="flex mt-1">
                 <input 
                    type="text" 
                    id="nipd-input" 
                    value={nipdInput}
                    onChange={(e) => setNipdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNipdValidation()}
                    onBlur={handleNipdValidation}
                    placeholder="Masukkan NIPD lalu tekan Tab"
                    disabled={isEditMode}
                    className="block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600"
                 />
            </div>
            {validationError && <p className="mt-2 text-sm text-red-500">{validationError}</p>}
            {validatedSiswa && (
                <div className="flex items-center p-3 mt-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                    <Avatar user={validatedSiswa} className="w-10 h-10 rounded-full" />
                    <div className="ml-3">
                        <p className="font-semibold text-green-800 dark:text-green-200">{validatedSiswa.nama}</p>
                        <p className="text-sm text-green-700 font-mono dark:text-green-300">{validatedSiswa.username}</p>
                    </div>
                </div>
            )}
          </div>

          {/* Manual Selection */}
          <div>
            <label htmlFor="perbaikan-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bimbingan / Perbaikan</label>
            <input
                id="perbaikan-search"
                type="text"
                placeholder="Cari perbaikan..."
                value={perbaikanSearchTerm}
                onChange={(e) => setPerbaikanSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
             <div className="mt-2 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                {Object.entries(groupedPerbaikan).length > 0 ? (
                    Object.entries(groupedPerbaikan).map(([group, items]) => (
                        <div key={group}>
                            <h4 className="px-3 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400 sticky top-0">{group}</h4>
                            {items.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setFormData(p => ({...p, id_perbaikan: item.id}))}
                                    className={`flex items-start px-3 py-2 cursor-pointer text-sm ${formData.id_perbaikan === item.id ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                >
                                    <span className="w-20 flex-shrink-0 font-semibold text-gray-500 dark:text-gray-400">(+{item.point_perbaikan} poin)</span>
                                    <span className="flex-grow pl-2">{item.desk_perbaikan}</span>
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">Tidak ada item perbaikan yang cocok.</p>
                )}
            </div>
          </div>
          
           <div>
            <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal</label>
            <input
                type="date"
                id="tanggal"
                name="tanggal"
                value={formData.tanggal}
                onChange={(e) => setFormData(p => ({...p, tanggal: e.target.value}))}
                required
                className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>

          {parentError && <p className="text-sm text-center text-red-500">{parentError}</p>}
          
          <div className="pt-4 space-x-3 text-right">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              Batal
            </button>
            <button type="submit" disabled={isSaving || !validatedSiswa || !formData.id_perbaikan} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-not-allowed">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BimbinganFormModal;
