import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Kelas, Sanksi, Pelanggaran, JenisSanksi, Role, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { Avatar } from '../components/Avatar';
import ConfirmationModal from '../components/ConfirmationModal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

interface CombinedPelanggaranData {
    pelanggaran: Pelanggaran;
    siswa: User;
    kelas: Kelas | null;
    sanksi: Sanksi;
}

const JenisSanksiBadge: React.FC<{ jenis: JenisSanksi }> = ({ jenis }) => {
    const colors: Record<JenisSanksi, string> = {
        [JenisSanksi.RINGAN]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [JenisSanksi.SEDANG]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [JenisSanksi.BERAT]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[jenis]}`}>{jenis}</span>;
};

const PelanggaranPage: React.FC = () => {
    const { pelanggaran, users, sanksi, siswa, kelas, addPelanggaran, updatePelanggaran, deletePelanggaran, user: currentUser, addLog } = useAuth();
    
    const [kelasFilter, setKelasFilter] = useState<number | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const [editingData, setEditingData] = useState<CombinedPelanggaranData | null>(null);
    const [dataToDelete, setDataToDelete] = useState<CombinedPelanggaranData | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isGuru = currentUser?.role === Role.GURU;

    const combinedData: CombinedPelanggaranData[] = useMemo(() => {
        const userMap = new Map(users.map(u => [u.username, u]));
        const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
        const siswaMap = new Map(siswa.map(s => [s.nipd, s]));
        const kelasMap = new Map(kelas.map(k => [k.id, k]));

        return pelanggaran.map(p => {
            const studentUser = userMap.get(p.nipd);
            const studentRelation = siswaMap.get(p.nipd);
            const studentSanksi = sanksiMap.get(p.id_sanksi);
            const studentKelas = studentRelation?.id_kelas ? kelasMap.get(studentRelation.id_kelas) : null;

            if (!studentUser || !studentSanksi) return null;

            return {
                pelanggaran: p,
                siswa: studentUser,
                kelas: studentKelas || null,
                sanksi: studentSanksi,
            };
        }).filter((p): p is CombinedPelanggaranData => p !== null);
    }, [pelanggaran, users, sanksi, siswa, kelas]);

    const filteredAndSortedData = useMemo(() => {
        let filtered = combinedData
            .filter(p => kelasFilter === 'all' || p.kelas?.id === kelasFilter)
            .filter(p => {
                const pDate = p.pelanggaran.tanggal;
                if (!startDate && !endDate) return true;
                if (startDate && endDate) return pDate >= startDate && pDate <= endDate;
                if (startDate) return pDate >= startDate;
                if (endDate) return pDate <= endDate;
                return true;
            });

        if (sortOrder !== 'none') {
            filtered.sort((a, b) => {
                return sortOrder === 'asc' 
                    ? a.sanksi.point_pelanggar - b.sanksi.point_pelanggar
                    : b.sanksi.point_pelanggar - a.sanksi.point_pelanggar;
            });
        } else {
            // Default sort: newest entry first (by ID descending)
            filtered.sort((a, b) => b.pelanggaran.id - a.pelanggaran.id);
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

    const handleEdit = (item: CombinedPelanggaranData) => {
        setError(null);
        setEditingData(item);
        setIsFormModalOpen(true);
    };

    const handleDelete = (item: CombinedPelanggaranData) => {
        setDataToDelete(item);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (dataToDelete) {
            await deletePelanggaran(dataToDelete.pelanggaran.id);
            setIsConfirmModalOpen(false);
            setDataToDelete(null);
        }
    };
    
    const handleSave = async (item: Omit<Pelanggaran, 'id'> | Pelanggaran) => {
        setError(null);
        try {
            if ('id' in item) {
                await updatePelanggaran(item);
            } else {
                await addPelanggaran(item);
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
          'Tanggal': new Date(p.pelanggaran.tanggal + 'T00:00:00').toLocaleDateString('id-ID'),
          'NIPD': p.siswa.username,
          'Nama Siswa': p.siswa.nama,
          'Kelas': p.kelas?.kelas || '-',
          'Deskripsi Pelanggaran': p.sanksi.desk_kesalahan,
          'Jenis Sanksi': p.sanksi.jenis_sanksi,
          'Poin': -p.sanksi.point_pelanggar,
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pelanggaran");
    
        const cols = Object.keys(dataToExport[0] || {});
        worksheet['!cols'] = cols.map(col => ({ wch: Math.max(...dataToExport.map(row => row[col]?.toString().length ?? 0), col.length) + 2 }));
    
        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `Daftar_Pelanggaran_${formattedDateTime}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        addLog(LogAction.EXPORT, LogEntity.PELANGGARAN, `Mengekspor ${dataToExport.length} data pelanggaran.`);
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Pelanggaran</h1>
                
                <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col w-full gap-2 sm:flex-row sm:w-auto">
                            <button onClick={handleAdd} className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm sm:w-auto bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
                                Tambah Pelanggaran
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
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Deskripsi Pelanggaran</th>
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
                                <tr key={p.pelanggaran.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Avatar user={p.siswa} className="w-10 h-10 rounded-full" />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{p.siswa.nama}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{p.siswa.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{p.sanksi.desk_kesalahan}</td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap"><JenisSanksiBadge jenis={p.sanksi.jenis_sanksi} /></td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-red-600 whitespace-nowrap dark:text-red-400">-{p.sanksi.point_pelanggar}</td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{new Date(p.pelanggaran.tanggal + 'T00:00:00').toLocaleDateString('id-ID')}</td>
                                    {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) && (
                                        <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                            <button onClick={() => handleEdit(p)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(p)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete"><TrashIcon className="w-5 h-5" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) ? 6 : 5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No infractions found.</td></tr>
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
                 <PelanggaranFormModal
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
                title="Konfirmasi Hapus Pelanggaran"
                message={`Apakah Anda yakin ingin menghapus pelanggaran oleh "${dataToDelete?.siswa.nama}" pada tanggal ${dataToDelete ? new Date(dataToDelete.pelanggaran.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : ''}?`}
            />
        </>
    );
};

export default PelanggaranPage;