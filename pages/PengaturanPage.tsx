
import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { AppSettings, LogAction, LogEntity, Role } from '../types';
import { DefaultLogoIcon } from '../components/icons/DefaultLogoIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { useAuth } from '../hooks/useAuth';

const PengaturanPage: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { addLog, users } = useAuth();
    const [formState, setFormState] = useState<AppSettings>(settings);
    const [logoPreview, setLogoPreview] = useState<string | null>(settings.appLogo);
    const [kopSuratLogoPreview, setKopSuratLogoPreview] = useState<string | null>(settings.kopSurat.logo);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormState(settings);
        setLogoPreview(settings.appLogo);
        setKopSuratLogoPreview(settings.kopSurat.logo);
    }, [settings]);

    const guruList = useMemo(() => users.filter(user => user.role === Role.GURU), [users]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name.startsWith('threshold-')) {
            const key = name.split('-')[1] as keyof AppSettings['pointThresholds'];
            setFormState(prev => ({
                ...prev,
                pointThresholds: { ...prev.pointThresholds, [key]: type === 'number' ? parseInt(value, 10) : value }
            }));
        } else if (name.startsWith('kopSurat-')) {
            const key = name.split('-')[1] as keyof AppSettings['kopSurat'];
            setFormState(prev => ({
                ...prev,
                kopSurat: { ...prev.kopSurat, [key]: value }
            }));
        } else if (name === 'spSignatoryUsername') {
             setFormState(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'app' | 'kopSurat') => {
        setMessage(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
            setMessage({ type: 'error', text: 'Logo harus berupa file gambar (png, jpg, gif).' });
            return;
        }
        if (file.size > 500 * 1024) { // 500KB limit
            setMessage({ type: 'error', text: 'Ukuran file logo tidak boleh melebihi 500KB.' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (type === 'app') {
                setLogoPreview(base64String);
                setFormState(prev => ({ ...prev, appLogo: base64String }));
            } else {
                setKopSuratLogoPreview(base64String);
                setFormState(prev => ({ ...prev, kopSurat: { ...prev.kopSurat, logo: base64String } }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await updateSettings(formState);
            addLog(LogAction.UBAH, LogEntity.PENGATURAN, 'Menyimpan pengaturan aplikasi.');
            setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pengaturan Aplikasi</h1>

            <div className="space-y-6">
                {/* Application Information Card */}
                <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Informasi Aplikasi</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div className="md:col-span-2">
                            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Aplikasi</label>
                            <input
                                type="text"
                                name="appName"
                                id="appName"
                                value={formState.appName}
                                onChange={handleInputChange}
                                className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo Aplikasi</label>
                            <div className="flex items-center mt-2 space-x-4">
                                <div className="flex items-center justify-center w-16 h-16 p-2 bg-gray-100 rounded-md dark:bg-gray-700">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo Preview" className="object-contain h-full max-w-full" />
                                    ) : (
                                        <DefaultLogoIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                                <label htmlFor="logo-upload" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                    <UploadIcon className="w-5 h-5 mr-2 -ml-1" />
                                    Ganti Logo
                                    <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png,image/jpeg,image/gif" onChange={(e) => handleLogoChange(e, 'app')} />
                                </label>
                            </div>
                             <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Gunakan file gambar, maks 500KB.</p>
                        </div>
                    </div>
                </div>

                {/* Letterhead Settings Card */}
                <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Pengaturan Kop Surat</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                        <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo Instansi</label>
                            <div className="flex items-center mt-2 space-x-4">
                                <div className="flex items-center justify-center w-16 h-16 p-2 bg-gray-100 rounded-md dark:bg-gray-700">
                                    {kopSuratLogoPreview ? (
                                        <img src={kopSuratLogoPreview} alt="Kop Surat Logo Preview" className="object-contain h-full max-w-full" />
                                    ) : (
                                        <DefaultLogoIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
                                <label htmlFor="kop-surat-logo-upload" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                    <UploadIcon className="w-5 h-5 mr-2 -ml-1" />
                                    Ganti Logo
                                    <input id="kop-surat-logo-upload" type="file" className="sr-only" accept="image/png,image/jpeg,image/gif" onChange={(e) => handleLogoChange(e, 'kopSurat')} />
                                </label>
                            </div>
                             <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Logo yang akan muncul di kop surat PDF.</p>
                        </div>
                        
                        {(Object.keys(formState.kopSurat) as Array<keyof typeof formState.kopSurat>).filter(k => k !== 'logo').map((key, index) => (
                           <div key={key}>
                                <label htmlFor={`kopSurat-${key}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Baris {index + 1}</label>
                                <input
                                    type="text"
                                    name={`kopSurat-${key}`}
                                    id={`kopSurat-${key}`}
                                    value={formState.kopSurat[key]}
                                    onChange={handleInputChange}
                                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Point Thresholds Card */}
                <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Ambang Batas Poin Kedisiplinan</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Atur batas poin untuk menentukan status kondisi siswa.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                            <label htmlFor="threshold-aman" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batas "Normal"</label>
                            <input
                                type="number"
                                name="threshold-aman"
                                id="threshold-aman"
                                value={formState.pointThresholds.aman}
                                onChange={handleInputChange}
                                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Poin hingga nilai ini dianggap 'Normal'. Di atasnya 'Perlu Pengawasan' hingga 29 poin.</p>
                        </div>
                        <div>
                            <label htmlFor="threshold-perhatian" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batas "Perlakuan Khusus"</label>
                            <input
                                type="number"
                                name="threshold-perhatian"
                                id="threshold-perhatian"
                                value={formState.pointThresholds.perhatian}
                                onChange={handleInputChange}
                                min={30}
                                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Poin di atas 29 hingga nilai ini dianggap 'Perlakuan Khusus'. Di atasnya dianggap 'Kondisi Kritis'.</p>
                        </div>
                    </div>
                </div>
                
                {/* SP Signatory Settings */}
                <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Pengaturan Surat Panggilan</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Pilih pengguna yang akan menandatangani Surat Panggilan (SP) yang dibuat.</p>
                    <div className="mt-4">
                        <label htmlFor="spSignatoryUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Penanda Tangan SP</label>
                        <select
                            id="spSignatoryUsername"
                            name="spSignatoryUsername"
                            value={formState.spSignatoryUsername || 'null'}
                            onChange={handleInputChange}
                            className="block w-full max-w-md px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="null">-- Default (Garis Bawah) --</option>
                            {guruList.map(guru => (
                                <option key={guru.username} value={guru.username}>{guru.nama} ({guru.username})</option>
                            ))}
                        </select>
                    </div>
                </div>

                 {/* Save Button & Messages */}
                 <div className="flex items-center justify-end pt-4 space-x-4">
                    {message && (
                        <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {message.text}
                        </p>
                    )}
                     <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
                    >
                        <SaveIcon className="w-5 h-5 mr-2 -ml-1" />
                        {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default PengaturanPage;
