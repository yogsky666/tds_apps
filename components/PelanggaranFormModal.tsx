
import React, { useState, useEffect, useMemo } from 'react';
import { Pelanggaran, User, Sanksi, Role, JenisSanksi } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';

interface PelanggaranFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Pelanggaran, 'id'> | Pelanggaran) => Promise<void>;
  initialData: {
      pelanggaran: Pelanggaran;
      siswa: User;
      sanksi: Sanksi;
  } | null;
  error?: string | null;
}

const PelanggaranFormModal: React.FC<PelanggaranFormModalProps> = ({ isOpen, onClose, onSave, initialData, error: parentError }) => {
  const { users, sanksi } = useAuth();
  
  const [formData, setFormData] = useState<Omit<Pelanggaran, 'id' | 'id_sanksi'> & { id_sanksi: number | '' }>({
    nipd: '',
    id_sanksi: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const [nipdInput, setNipdInput] = useState('');
  const [validatedSiswa, setValidatedSiswa] = useState<User | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sanksiSearchTerm, setSanksiSearchTerm] = useState('');

  const isEditMode = !!initialData;
  const userMap = useMemo(() => new Map(users.map(u => [u.username, u])), [users]);

  useEffect(() => {
    setValidationError(null);
    setValidatedSiswa(null);
    setSanksiSearchTerm('');

    if (isOpen) {
        if (initialData) {
            const student = userMap.get(initialData.pelanggaran.nipd);
            setNipdInput(initialData.pelanggaran.nipd);
            if(student) setValidatedSiswa(student);

            setFormData({
                nipd: initialData.pelanggaran.nipd,
                id_sanksi: initialData.pelanggaran.id_sanksi,
                tanggal: initialData.pelanggaran.tanggal,
            });
        } else {
            // Reset for new entry
            setNipdInput('');
            setFormData({
                nipd: '',
                id_sanksi: '',
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
    if (!formData.nipd || !formData.id_sanksi) {
        setValidationError("Pastikan siswa sudah divalidasi dan sanksi sudah dipilih.");
        return;
    }
    setIsSaving(true);
    const dataToSubmit: Omit<Pelanggaran, 'id'> = {
        ...formData,
        id_sanksi: Number(formData.id_sanksi),
    };

    const dataToSave = initialData ? { ...dataToSubmit, id: initialData.pelanggaran.id } : dataToSubmit;
    await onSave(dataToSave);
    setIsSaving(false);
  };
  
  const groupedSanksi = useMemo(() => {
    const filtered = sanksi.filter(s => 
        s.desk_kesalahan.toLowerCase().includes(sanksiSearchTerm.toLowerCase())
    );
    return filtered.reduce((acc, curr) => {
        const group = curr.jenis_sanksi;
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(curr);
        return acc;
    }, {} as Record<JenisSanksi, Sanksi[]>);
  }, [sanksi, sanksiSearchTerm]);

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
          {isEditMode ? 'Edit Pelanggaran' : 'Tambah Pelanggaran Baru'}
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
            <label htmlFor="sanksi-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sanksi</label>
            <input
                id="sanksi-search"
                type="text"
                placeholder="Cari sanksi..."
                value={sanksiSearchTerm}
                onChange={(e) => setSanksiSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
             <div className="mt-2 w-full max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600">
                {Object.entries(groupedSanksi).length > 0 ? (
                    Object.entries(groupedSanksi).map(([group, items]) => (
                        <div key={group}>
                            <h4 className="px-3 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 dark:text-gray-400 sticky top-0">{group}</h4>
                            {items.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => setFormData(p => ({...p, id_sanksi: s.id}))}
                                    className={`flex items-start px-3 py-2 cursor-pointer text-sm ${formData.id_sanksi === s.id ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                >
                                    <span className="w-20 flex-shrink-0 font-semibold text-gray-500 dark:text-gray-400">({s.point_pelanggar} poin)</span>
                                    <span className="flex-grow pl-2">{s.desk_kesalahan}</span>
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">Tidak ada sanksi yang cocok.</p>
                )}
            </div>
          </div>

           <div>
            <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Kejadian</label>
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
            <button type="submit" disabled={isSaving || !validatedSiswa || !formData.id_sanksi} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-not-allowed">
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PelanggaranFormModal;
