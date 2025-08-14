import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Kelas, Introspeksi, Bimbingan, JenisPerbaikan, Role, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { Avatar } from '../components/Avatar';
import ConfirmationModal from '../components/ConfirmationModal';
import BimbinganFormModal from '../components/BimbinganFormModal';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

interface CombinedBimbinganData {
    bimbingan: Bimbingan;
    siswa: User;
    kelas: Kelas | null;
    perbaikan: Introspeksi;
}

const JenisPerbaikanBadge: React.FC<{ jenis: JenisPerbaikan }> = ({ jenis }) => {
    const colors: Record<JenisPerbaikan, string> = {
        [JenisPerbaikan.MUDAH]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [JenisPerbaikan.CUKUP]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        [JenisPerbaikan.SULIT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[jenis]}`}>{jenis}</span>;
};

const BimbinganPage: React.FC = () => {
    const { bimbingan, users, introspeksi, siswa, kelas, addBimbingan, updateBimbingan, deleteBimbingan, user: currentUser, addLog } = useAuth();
    
    const [kelasFilter, setKelasFilter] = useState<number | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [editingData, setEditingData] = useState<CombinedBimbinganData | null>(null);
    const [dataToDelete, setDataToDelete] = useState<CombinedBimbinganData | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isGuru = currentUser?.role === Role.GURU;

    const combinedData: CombinedBimbinganData[] = useMemo(() => {
        const userMap = new Map(users.map(u => [u.username, u]));
        const perbaikanMap = new Map(introspeksi.map(i => [i.id, i]));
        const siswaMap = new Map(siswa.map(s => [s.nipd, s]));
        const kelasMap = new Map(kelas.map(k => [k.id, k]));

        return bimbingan.map(b => {
            const studentUser = userMap.get(b.nipd);
            const studentRelation = siswaMap.get(b.nipd);
            const studentPerbaikan = perbaikanMap.get(b.id_perbaikan);
            const studentKelas = studentRelation?.id_kelas ? kelasMap.get(studentRelation.id_kelas) : null;

            if (!studentUser || !studentPerbaikan) return null;

            return {
                bimbingan: b,
                siswa: studentUser,
                kelas: studentKelas || null,
                perbaikan: studentPerbaikan,
            };
        }).filter((p): p is CombinedBimbinganData => p !== null);
    }, [bimbingan, users, introspeksi, siswa, kelas]);

    const filteredAndSortedData = useMemo(() => {
        let filtered = combinedData
            .filter(p => kelasFilter === 'all' || p.kelas?.id === kelasFilter)
            .filter(p => {
                const bDate = p.bimbingan.tanggal;
                if (!startDate && !endDate) return true;
                if (startDate && endDate) return bDate >= startDate && bDate <= endDate;
                if (startDate) return bDate >= startDate;
                if (endDate) return bDate <= endDate;
                return true;
            });

        if (sortOrder !== 'none') {
            filtered.sort((a, b) => {
                return sortOrder === 'asc' 
                    ? a.perbaikan.point_perbaikan - b.perbaikan.point_perbaikan
                    : b.perbaikan.point_perbaikan - a.perbaikan.point_perbaikan;
            });
        } else {
            // Default sort: newest entry first (by ID descending)
            filtered.sort((a, b) => b.bimbingan.id - a.bimbingan.id);
        }
        return filtered;
    }, [combinedData, kelasFilter, sortOrder, startDate, endDate]);

    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSortedData, currentPage]);
    
    const handleAdd = () => {
        setError(null);
        setEditingData(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (item: CombinedBimbinganData) => {
        setError(null);
        setEditingData(item);
        setIsFormModalOpen(true);
    };

    const handleDelete = (item: CombinedBimbinganData) => {
        setDataToDelete(item);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (dataToDelete) {
            await deleteBimbingan(dataToDelete.bimbingan.id);
            setIsConfirmModalOpen(false);
            setDataToDelete(null);
        }
    };
    
    const handleSave = async (item: Omit<Bimbingan, 'id'> | Bimbingan) => {
        setError(null);
        try {
            if ('id' in item) {
                await updateBimbingan(item);
            } else {
                await addBimbingan(item);
            }
            setIsFormModalOpen(false);
            setEditingData(null);
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedData.map((p, index) => ({
          'No.': index + 1,
          'Tanggal': new Date(p.bimbingan.tanggal + 'T00:00:00').toLocaleDateString('id-ID'),
          'NIPD': p.siswa.username,
          'Nama Siswa': p.siswa.nama,
          'Kelas': p.kelas?.kelas || '-',
          'Deskripsi Perbaikan': p.perbaikan.desk_perbaikan,
          'Jenis Perbaikan': p.perbaikan.jenis_perbaikan,
          'Poin': p.perbaikan.point_perbaikan,
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bimbingan");
    
        const cols = Object.keys(dataToExport[0] || {});
        worksheet['!cols'] = cols.map(col => ({ wch: Math.max(...dataToExport.map(row => row[col]?.toString().length ?? 0), col.length) + 2 }));
    
        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `Daftar_Bimbingan_${formattedDateTime}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        addLog(LogAction.EXPORT, LogEntity.BIMBINGAN, `Mengekspor ${dataToExport.length} data bimbingan.`);
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Bimbingan</h1>
                
                <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col w-full gap-2 sm:flex-row sm:w-auto">
                            <button onClick={handleAdd} className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm sm:w-auto bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
                                Tambah Bimbingan
                            </button>
                            {!isGuru && (
                                <button onClick={handleExportExcel} className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm sm:w-auto hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                    <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                                    Export
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="w-full sm:w-auto">
                                <select id="kelasFilter" aria-label="Filter Kelas" value={kelasFilter} onChange={e => setKelasFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="all">Semua Kelas</option>
                                    {kelas.map(k => <option key={k.id} value={k.id}>{k.kelas}</option>)}
                                </select>
                            </div>
                            <div className="w-full sm:w-auto">
                                <select id="sortOrder" aria-label="Filter Urutan" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <option value="none">Urutan Default</option>
                                    <option value="asc">Poin Terendah</option>
                                    <option value="desc">Poin Tertinggi</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    aria-label="Tanggal Awal"
                                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                />
                                <span className="text-gray-500 dark:text-gray-400">-</span>
                                 <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    aria-label="Tanggal Akhir"
                                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Siswa</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Deskripsi Perbaikan</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Jenis</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Poin</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Tanggal</th>
                                {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) && (
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Action</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {paginatedData.map(p => (
                                <tr key={p.bimbingan.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Avatar user={p.siswa} className="w-10 h-10 rounded-full" />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{p.siswa.nama}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{p.siswa.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{p.perbaikan.desk_perbaikan}</td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap"><JenisPerbaikanBadge jenis={p.perbaikan.jenis_perbaikan} /></td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-green-600 whitespace-nowrap dark:text-green-400">+{p.perbaikan.point_perbaikan}</td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{new Date(p.bimbingan.tanggal + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                                    {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) && (
                                        <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                            <button onClick={() => handleEdit(p)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(p)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete"><TrashIcon className="w-5 h-5" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) ? 6 : 5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No guidance records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md">
                        <div className="hidden sm:block">
                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div className="flex justify-between flex-1 sm:justify-end">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
                        </div>
                    </nav>
                )}
            </div>

            {isFormModalOpen && (
                 <BimbinganFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => { setIsFormModalOpen(false); setError(null); }}
                    onSave={handleSave}
                    initialData={editingData}
                    error={error}
                />
            )}
           
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Bimbingan"
                message={`Apakah Anda yakin ingin menghapus catatan bimbingan untuk "${dataToDelete?.siswa.nama}" pada tanggal ${dataToDelete ? new Date(dataToDelete.bimbingan.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : ''}?`}
            />
        </>
    );
};

export default BimbinganPage;