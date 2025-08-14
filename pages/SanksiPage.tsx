import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sanksi, JenisSanksi, Role, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import SanksiFormModal from '../components/SanksiFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

const JenisSanksiBadge: React.FC<{ jenis: JenisSanksi }> = ({ jenis }) => {
    const colors: Record<JenisSanksi, string> = {
        [JenisSanksi.RINGAN]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [JenisSanksi.SEDANG]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [JenisSanksi.BERAT]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[jenis]}`}>
            {jenis}
        </span>
    );
};

const SanksiPage: React.FC = () => {
    const { sanksi, addSanksi, updateSanksi, deleteSanksi, user, addLog } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [jenisFilter, setJenisFilter] = useState<JenisSanksi | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingSanksi, setEditingSanksi] = useState<Sanksi | null>(null);
    const [sanksiToDelete, setSanksiToDelete] = useState<Sanksi | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isGuru = user?.role === Role.GURU;

    const filteredAndSortedSanksi = useMemo(() => {
        const jenisSanksiOrder: Record<JenisSanksi, number> = {
            [JenisSanksi.RINGAN]: 1,
            [JenisSanksi.SEDANG]: 2,
            [JenisSanksi.BERAT]: 3,
        };

        const filtered = sanksi
            .filter(s =>
                s.desk_kesalahan.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (jenisFilter === 'all' || s.jenis_sanksi === jenisFilter)
            );
            
        filtered.sort((a, b) => {
            const orderA = jenisSanksiOrder[a.jenis_sanksi];
            const orderB = jenisSanksiOrder[b.jenis_sanksi];

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return a.desk_kesalahan.localeCompare(b.desk_kesalahan);
        });

        return filtered;
    }, [sanksi, searchTerm, jenisFilter]);

    const totalPages = Math.ceil(filteredAndSortedSanksi.length / ITEMS_PER_PAGE);
    const paginatedSanksi = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedSanksi.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSortedSanksi, currentPage]);

    const handleAddSanksi = () => {
        setError(null);
        setEditingSanksi(null);
        setIsFormModalOpen(true);
    };

    const handleEditSanksi = (s: Sanksi) => {
        setError(null);
        setEditingSanksi(s);
        setIsFormModalOpen(true);
    };

    const handleDeleteSanksi = (s: Sanksi) => {
        setSanksiToDelete(s);
        setIsConfirmModalOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (sanksiToDelete) {
            await deleteSanksi(sanksiToDelete.id);
            setIsConfirmModalOpen(false);
            setSanksiToDelete(null);
        }
    };
    
    const handleSaveSanksi = async (sanksiToSave: Omit<Sanksi, 'id'> | Sanksi) => {
        setError(null);
        try {
            if ('id' in sanksiToSave) {
                await updateSanksi(sanksiToSave);
            } else {
                await addSanksi(sanksiToSave);
            }
            setIsFormModalOpen(false);
            setEditingSanksi(null);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
        }
    };
    
    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedSanksi.map((s, index) => ({
          'No.': index + 1,
          'Deskripsi Kesalahan': s.desk_kesalahan,
          'Jenis Sanksi': s.jenis_sanksi,
          'Poin Pelanggar': s.point_pelanggar,
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sanksi");
    
        const cols = Object.keys(dataToExport[0] || {});
        const colWidths = cols.map(col => ({
            wch: Math.max(...dataToExport.map(row => row[col]?.toString().length ?? 0), col.length) + 2
        }));
        worksheet['!cols'] = colWidths;
    
        const jenisText = jenisFilter === 'all' ? 'Semua' : jenisFilter;
        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `Daftar_Sanksi_${jenisText}_${formattedDateTime}.xlsx`;
    
        XLSX.writeFile(workbook, fileName);
        addLog(LogAction.EXPORT, LogEntity.SANKSI, `Mengekspor ${dataToExport.length} data sanksi.`);
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Sanksi</h1>

                <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Left side: Filters */}
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <input
                                type="search"
                                placeholder="Cari deskripsi kesalahan..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md md:w-64 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            />
                            <select
                                value={jenisFilter}
                                onChange={e => { setJenisFilter(e.target.value as JenisSanksi | 'all'); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md md:w-52 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Semua Jenis Sanksi</option>
                                <option value={JenisSanksi.RINGAN}>Ringan</option>
                                <option value={JenisSanksi.SEDANG}>Sedang</option>
                                <option value={JenisSanksi.BERAT}>Berat</option>
                            </select>
                        </div>

                        {/* Right side: Actions */}
                        {!isGuru && (
                          <div className="flex items-center space-x-2">
                              <button 
                                  onClick={handleExportExcel} 
                                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm md:w-auto hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                              >
                                  <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                                  Export
                              </button>
                              <button 
                                  onClick={handleAddSanksi} 
                                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm md:w-auto hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              >
                                  <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
                                  Tambah Sanksi
                              </button>
                          </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="w-1/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">No.</th>
                                <th scope="col" className="w-5/12 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Deskripsi Kesalahan</th>
                                <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Jenis</th>
                                <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Poin</th>
                                {!isGuru && <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {paginatedSanksi.map((s, index) => (
                                <tr key={s.id}>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                    <td className="px-6 py-4 text-sm text-left text-gray-900 dark:text-white">{s.desk_kesalahan}</td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap"><JenisSanksiBadge jenis={s.jenis_sanksi} /></td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900 whitespace-nowrap dark:text-white">{s.point_pelanggar}</td>
                                    {!isGuru && (
                                      <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                          <button onClick={() => handleEditSanksi(s)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                          {(user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN) && (
                                            <button onClick={() => handleDeleteSanksi(s)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete"><TrashIcon className="w-5 h-5" /></button>
                                          )}
                                      </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedSanksi.length === 0 && (
                                <tr><td colSpan={!isGuru ? 5 : 4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No sanctions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
                        <div className="hidden sm:block">
                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedSanksi.length)}</span> of{' '}
                                <span className="font-medium">{filteredAndSortedSanksi.length}</span> results
                            </p>
                        </div>
                        <div className="flex justify-between flex-1 sm:justify-end">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
                        </div>
                    </nav>
                )}
            </div>
            
            <SanksiFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setError(null); }}
                onSave={handleSaveSanksi}
                initialData={editingSanksi}
                error={error}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Sanksi"
                message={`Apakah Anda yakin ingin menghapus sanksi "${sanksiToDelete?.desk_kesalahan}" secara permanen?`}
            />
        </>
    );
};

export default SanksiPage;
