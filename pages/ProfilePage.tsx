import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/Avatar';
import { CameraIcon } from '../components/icons/CameraIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { IdentificationIcon } from '../components/icons/IdentificationIcon';
import { User, LogAction, LogEntity, Role } from '../types';

const ProfilePage: React.FC = () => {
    const { user, updateUser, updateUserPhoto, changePassword, addLog } = useAuth();
    
    const [name, setName] = useState(user?.nama || '');
    const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSavingName, setIsSavingName] = useState(false);

    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [isSavingPhoto, setIsSavingPhoto] = useState(false);

    if (!user) {
        return <div>Loading...</div>;
    }

    const handleNameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameMessage(null);
        setIsSavingName(true);
        try {
            const updatedUser: User = { ...user, nama: name };
            await updateUser(updatedUser);
            addLog(LogAction.UBAH, LogEntity.PROFIL, 'Memperbarui nama profil.');
            setNameMessage({ type: 'success', text: 'Nama berhasil diperbarui.' });
        } catch (error) {
            setNameMessage({ type: 'error', text: 'Gagal memperbarui nama.' });
        } finally {
            setIsSavingName(false);
            setTimeout(() => setNameMessage(null), 3000);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Kata sandi baru dan konfirmasi tidak cocok.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
            return;
        }

        setIsSavingPassword(true);
        try {
            await changePassword(user.username, passwordData.currentPassword, passwordData.newPassword);
            setPasswordMessage({ type: 'success', text: 'Kata sandi berhasil diubah.' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            if (err instanceof Error) {
                setPasswordMessage({ type: 'error', text: err.message });
            } else {
                setPasswordMessage({ type: 'error', text: 'Terjadi kesalahan tidak diketahui.' });
            }
        } finally {
            setIsSavingPassword(false);
            setTimeout(() => setPasswordMessage(null), 3000);
        }
    };

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                setPhotoError('Ukuran file tidak boleh melebihi 1MB.');
                setPhotoPreview(null);
                return;
            }
            setPhotoError(null);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleSavePhoto = async () => {
        if (!photoPreview) return;
        setIsSavingPhoto(true);
        setPhotoError(null);
        try {
            await updateUserPhoto(user.username, photoPreview);
            setPhotoPreview(null);
        } catch (err) {
            setPhotoError("Gagal menyimpan foto. Silakan coba lagi.");
        } finally {
            setIsSavingPhoto(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profil Saya</h1>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Profile Info Card */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="p-6 text-center bg-white rounded-lg shadow-md dark:bg-gray-800">
                        <div className="relative inline-block mx-auto mb-4">
                            <Avatar user={user} className="w-32 h-32 rounded-full" />
                            <label htmlFor="photo-upload" className="absolute bottom-1 right-1 p-2 text-white bg-primary-600 rounded-full shadow-md cursor-pointer hover:bg-primary-700">
                                <CameraIcon className="w-5 h-5" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handlePhotoFileChange} />
                            </label>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.nama}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{user.username}</p>
                        <span className="inline-block px-3 py-1 mt-2 text-xs font-semibold text-green-800 capitalize bg-green-100 rounded-full dark:bg-green-900/50 dark:text-green-300">{user.role}</span>
                        
                        {photoPreview && (
                            <div className="p-4 mt-4 text-center bg-gray-100 rounded-lg dark:bg-gray-700">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Pratinjau Foto Baru</p>
                                <img src={photoPreview} alt="Pratinjau foto baru" className="object-cover w-24 h-24 mx-auto my-2 rounded-full" />
                                {photoError && <p className="text-xs text-red-500">{photoError}</p>}
                                <div className="flex justify-center mt-2 space-x-2">
                                    <button onClick={() => setPhotoPreview(null)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500">Batal</button>
                                    <button onClick={handleSavePhoto} disabled={isSavingPhoto} className="px-3 py-1 text-xs font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400">{isSavingPhoto ? 'Menyimpan...' : 'Simpan'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Forms Card */}
                <div className="space-y-8 lg:col-span-2">
                    {/* Change Name Form */}
                    {user.role !== Role.SISWA && (
                        <form onSubmit={handleNameChange} className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-3">Ubah Nama</h3>
                            <div className="mt-4">
                                <label htmlFor="nama" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                                <input
                                    type="text"
                                    id="nama"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div className="flex items-center justify-end mt-4">
                                {nameMessage && <p className={`text-sm mr-4 ${nameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{nameMessage.text}</p>}
                                <button type="submit" disabled={isSavingName} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400">
                                    <SaveIcon className="w-5 h-5 mr-2 -ml-1" />
                                    {isSavingName ? 'Menyimpan...' : 'Simpan Nama'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Change Password Form */}
                    <form onSubmit={handlePasswordChange} className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-3">Ubah Kata Sandi</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="currentPassword">Kata Sandi Saat Ini</label>
                                <input type="password" id="currentPassword" value={passwordData.currentPassword} onChange={(e) => setPasswordData(p => ({...p, currentPassword: e.target.value}))} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label htmlFor="newPassword">Kata Sandi Baru</label>
                                <input type="password" id="newPassword" value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                             <div>
                                <label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</label>
                                <input type="password" id="confirmPassword" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end mt-4">
                            {passwordMessage && <p className={`text-sm mr-4 ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage.text}</p>}
                            <button type="submit" disabled={isSavingPassword} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400">
                                <SaveIcon className="w-5 h-5 mr-2 -ml-1" />
                                {isSavingPassword ? 'Menyimpan...' : 'Ubah Kata Sandi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;