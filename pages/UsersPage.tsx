
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Role, Gender, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import UserDetailModal from '../components/UserDetailModal';
import UserFormModal from '../components/UserFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Avatar } from '../components/Avatar';
import * as XLSX from 'xlsx';

const KeyIcon: React.FC<{ className?: string }> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
);

const ITEMS_PER_PAGE = 10;

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
    const roleColors: Record<Role, string> = {
        [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        [Role.ADMIN]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [Role.TDS]: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
        [Role.GURU]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [Role.SISWA]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${roleColors[role]}`}>
            {role}
        </span>
    );
};

const UsersPage: React.FC = () => {
  const { users, addUsers, updateUser, deleteUser, updateUserPhoto, addLog, user: currentUser, adminResetPassword } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const filteredUsers = useMemo(() => {
    const roleOrder: Record<Role, number> = {
        [Role.SUPER_ADMIN]: 0,
        [Role.ADMIN]: 1,
        [Role.TDS]: 2,
        [Role.GURU]: 3,
        [Role.SISWA]: 4,
    };

    return users
      .filter(user =>
        user.nama.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(user =>
        roleFilter === 'all' ? true : user.role === roleFilter
      )
      .sort((a, b) => {
        const orderA = roleOrder[a.role] || 99;
        const orderB = roleOrder[b.role] || 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.nama.localeCompare(b.nama);
      });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);
  
  const handleAddUser = () => {
    setError(null);
    setEditingUser(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditUser = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setError(null);
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteUser = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (userToDelete) {
        await deleteUser(userToDelete.username);
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
    }
  };
  
  const handleResetPassword = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToReset(user);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (userToReset) {
        await adminResetPassword(userToReset.username);
        setIsResetModalOpen(false);
        setResetSuccessMessage(`Kata sandi untuk ${userToReset.nama} berhasil direset menjadi "password".`);
        setUserToReset(null);
        setTimeout(() => {
            setResetSuccessMessage('');
        }, 5000);
    }
  };

  const handleSaveUser = async (userToSave: User) => {
    setError(null);
    try {
      if (editingUser) {
        await updateUser(userToSave);
      } else {
        // Since single add now goes through the form, we can use addUsers with a single item
        await addUsers([userToSave]);
      }
      setIsFormModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
        {
            nama: 'Super Admin Baru',
            username: 'superadmin02',
            jenis_kelamin: 'laki-laki',
            role: 'superadmin'
        },
        {
            nama: 'Budi Santoso',
            username: '199001012020121010',
            jenis_kelamin: 'laki-laki',
            role: 'guru'
        },
        {
            nama: 'Citra Lestari',
            username: '0012345679',
            jenis_kelamin: 'perempuan',
            role: 'siswa'
        },
        {
            nama: 'Tim Disiplin',
            username: 'tds01',
            jenis_kelamin: 'laki-laki',
            role: 'tds'
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    worksheet['!cols'] = [ { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 } ];

    XLSX.utils.sheet_add_aoa(worksheet, [
        ["CATATAN: Isi kolom 'jenis_kelamin' dengan 'laki-laki' atau 'perempuan'. Isi 'role' dengan 'superadmin', 'admin', 'guru', 'siswa', atau 'tds'. Username harus unik."]
    ], { origin: "A6" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Pengguna");
    XLSX.writeFile(workbook, "template_pengguna.xlsx");
  };

  const handleImportClick = () => {
      setImportFeedback(null);
      importFileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportFeedback(null);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          try {
              const data = event.target?.result;
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json<any>(worksheet);

              const newUsers: Omit<User, 'photo'>[] = json.map(row => ({
                  nama: row.nama?.toString().trim(),
                  username: row.username?.toString().trim(),
                  jenis_kelamin: row.jenis_kelamin?.toString().toLowerCase().trim() as Gender,
                  role: row.role?.toString().toLowerCase().trim() as Role,
              })).filter(user => user.nama && user.username);

              if (newUsers.length === 0) {
                  throw new Error("Tidak ada data pengguna yang valid ditemukan. Pastikan header kolom adalah: nama, username, jenis_kelamin, role.");
              }

              const { successCount, errors } = await addUsers(newUsers);

              let successMessage = `Berhasil mengimpor ${successCount} pengguna.`;
              let errorMessage = errors.length > 0 ? `Gagal mengimpor ${errors.length} pengguna:\n- ${errors.slice(0, 5).join('\n- ')}` : '';
              if (errors.length > 5) errorMessage += `\n...dan ${errors.length - 5} lainnya.`;
              
              setImportFeedback({ 
                  type: errors.length > 0 ? 'error' : 'success', 
                  message: [successMessage, errorMessage].filter(Boolean).join('\n\n')
              });

          } catch (err) {
              const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses file.';
              setImportFeedback({ type: 'error', message });
          } finally {
              setIsImporting(false);
              if(e.target) e.target.value = '';
          }
      };
      
      reader.onerror = () => {
          setImportFeedback({ type: 'error', message: "Gagal membaca file." });
          setIsImporting(false);
          if(e.target) e.target.value = '';
      };

      reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredUsers.map((user, index) => ({
      'No.': index + 1,
      'Nama': user.nama,
      'Username': user.username,
      'Jenis Kelamin': user.jenis_kelamin,
      'Role': user.role,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pengguna");

    const cols = Object.keys(dataToExport[0] || {});
    const colWidths = cols.map(col => ({
        wch: Math.max(...dataToExport.map(row => row[col]?.toString().length ?? 0), col.length) + 2
    }));
    worksheet['!cols'] = colWidths;

    const roleText = roleFilter === 'all' ? 'Semua' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1);
    const now = new Date();
    const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `Daftar_Pengguna_${roleText}_${formattedDateTime}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    addLog(LogAction.EXPORT, LogEntity.PENGGUNA, `Mengekspor ${dataToExport.length} data pengguna.`);
  };

  const handleRowClick = (user: User) => {
      setSelectedUser(user);
  }
  
  const handleUpdatePhoto = async (username: string, photo: string) => {
      await updateUserPhoto(username, photo);
      setSelectedUser(prev => prev ? {...prev, photo} : null);
  }

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Pengguna</h1>

        <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <input
                        type="search"
                        placeholder="Cari berdasarkan nama..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md sm:w-64 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                    <select
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value as Role | 'all'); setCurrentPage(1); }}
                        className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md sm:w-auto focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">Semua Role</option>
                        <option value={Role.SUPER_ADMIN}>Super Admin</option>
                        <option value={Role.ADMIN}>Admin</option>
                        <option value={Role.TDS}>TDS</option>
                        <option value={Role.GURU}>Guru</option>
                        <option value={Role.SISWA}>Siswa</option>
                    </select>
                </div>

                <div className="flex flex-wrap items-center justify-start gap-2 shrink-0">
                    <button onClick={handleDownloadTemplate} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                        <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                        Template
                    </button>
                    <button onClick={handleImportClick} disabled={isImporting} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400">
                        <UploadIcon className="w-5 h-5 mr-2 -ml-1" />
                        {isImporting ? 'Mengimpor...' : 'Import'}
                    </button>
                    <button onClick={handleExportExcel} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                        <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                        Export
                    </button>
                    <button onClick={handleAddUser} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
                        Tambah
                    </button>
                </div>
            </div>
            {resetSuccessMessage && (
                <div className="p-4 mt-4 text-sm rounded-lg bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200" role="alert">
                    <p className="font-medium">{resetSuccessMessage}</p>
                </div>
            )}
            {importFeedback && (
                <div className={`p-4 mt-4 text-sm rounded-lg ${importFeedback.type === 'success' ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200'}`} role="alert">
                    <p className="whitespace-pre-wrap font-medium">{importFeedback.message}</p>
                </div>
            )}
        </div>
        
        <input type="file" ref={importFileRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

        <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">No.</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Nama</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Username</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Jenis Kelamin</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Role</th>
                {currentUser?.role === Role.SUPER_ADMIN && (
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {paginatedUsers.map((user, index) => (
                <tr 
                  key={user.username} 
                  className="transition-colors duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleRowClick(user)}
                >
                  <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <Avatar user={user} className="w-10 h-10 rounded-full" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.nama}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-left text-gray-500 whitespace-nowrap dark:text-gray-400">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500 capitalize whitespace-nowrap dark:text-gray-400">
                    {user.jenis_kelamin}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <RoleBadge role={user.role} />
                  </td>
                  {currentUser?.role === Role.SUPER_ADMIN && (
                    <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                        <button onClick={(e) => handleEditUser(e, user)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit">
                          <PencilIcon className="w-5 h-5"/>
                        </button>
                        <button
                          onClick={(e) => handleResetPassword(e, user)}
                          className="p-1 ml-2 text-yellow-600 hover:text-yellow-900 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-yellow-400 dark:hover:text-yellow-200"
                          title="Reset Password"
                          disabled={user.username === currentUser?.username}
                        >
                          <KeyIcon className="w-5 h-5" />
                        </button>
                        <button onClick={(e) => handleDeleteUser(e, user)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedUsers.length === 0 && (
                  <tr>
                      <td colSpan={currentUser?.role === Role.SUPER_ADMIN ? 6 : 5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No users found.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
          {totalPages > 1 && (
              <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
                  <div className="hidden sm:block">
                      <p className="text-sm text-gray-700 dark:text-gray-400">
                          Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> of{' '}
                          <span className="font-medium">{filteredUsers.length}</span> results
                      </p>
                  </div>
                  <div className="flex justify-between flex-1 sm:justify-end">
                      <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                          Previous
                      </button>
                      <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                          Next
                      </button>
                  </div>
              </nav>
          )}
      </div>
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdatePhoto={handleUpdatePhoto} />
      <UserFormModal 
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setError(null);
        }}
        onSave={handleSaveUser}
        initialData={editingUser}
        error={error}
        currentUserRole={currentUser?.role}
      />
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete?.nama}" secara permanen? Tindakan ini tidak dapat diurungkan.`}
      />
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        title="Konfirmasi Reset Kata Sandi"
        message={`Apakah Anda yakin ingin mereset kata sandi untuk pengguna "${userToReset?.nama}"? Kata sandi akan diatur kembali ke "password".`}
        confirmText="Reset"
      />
    </>
  );
};

export default UsersPage;