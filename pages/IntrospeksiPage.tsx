import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Introspeksi, JenisPerbaikan, Role, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import IntrospeksiFormModal from '../components/IntrospeksiFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

const JenisPerbaikanBadge: React.FC<{ jenis: JenisPerbaikan }> = ({ jenis }) => {
    const colors: Record<JenisPerbaikan, string> = {
        [JenisPerbaikan.MUDAH]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [JenisPerbaikan.CUKUP]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        [JenisPerbaikan.SULIT]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[jenis]}`}>
            {jenis}
        </span>
    );
};

const IntrospeksiPage: React.FC = () => {
    const { introspeksi, addIntrospeksi, updateIntrospeksi, deleteIntrospeksi, user, addLog } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [jenisFilter, setJenisFilter] = useState<JenisPerbaikan | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingData, setEditingData] = useState<Introspeksi | null>(null);
    const [dataToDelete, setDataToDelete] = useState<Introspeksi | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isGuru = user?.role === Role.GURU;

    const filteredAndSortedData = useMemo(() => {
        const jenisPerbaikanOrder: Record<JenisPerbaikan, number> = {
            [JenisPerbaikan.MUDAH]: 1,
            [JenisPerbaikan.CUKUP]: 2,
            [JenisPerbaikan.SULIT]: 3,
        };

        const filtered = introspeksi.filter(i =>
            i.desk_perbaikan.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (jenisFilter === 'all' || i.jenis_perbaikan === jenisFilter)
        );

        filtered.sort((a, b) => {
            const orderA = jenisPerbaikanOrder[a.jenis_perbaikan];
            const orderB = jenisPerbaikanOrder[b.jenis_perbaikan];

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return a.desk_perbaikan.localeCompare(b.desk_perbaikan);
        });
        
        return filtered;
    }, [introspeksi, searchTerm, jenisFilter]);

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

    const handleEdit = (item: Introspeksi) => {
        setError(null);
        setEditingData(item);
        setIsFormModalOpen(true);
    };

    const handleDelete = (item: Introspeksi) => {
        setDataToDelete(item);
        setIsConfirmModalOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (dataToDelete) {
            await deleteIntrospeksi(dataToDelete.id);
            setIsConfirmModalOpen(false);
            setDataToDelete(null);
        }
    };
    
    const handleSave = async (itemToSave: Omit<Introspeksi, 'id'> | Introspeksi) => {
        setError(null);
        try {
            if ('id' in itemToSave) {
                await updateIntrospeksi(itemToSave);
            } else {
                await addIntrospeksi(itemToSave);
            }
            setIsFormModalOpen(false);
            setEditingData(null);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredAndSortedData.map((item, index) => ({
          'No.': index + 1,
          'Deskripsi Perbaikan': item.desk_perbaikan,
          'Jenis Perbaikan': item.jenis_perbaikan,
          'Poin Perbaikan': item.point_perbaikan,
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Introspeksi");
    
        const cols = Object.keys(dataToExport[0] || {});
        const colWidths = cols.map(col => ({
            wch: Math.max(...dataToExport.map(row => row[col]?.toString().length ?? 0), col.length) + 2
        }));
        worksheet['!cols'] = colWidths;
    
        const jenisText = jenisFilter === 'all' ? 'Semua' : jenisFilter;
        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `Daftar_Introspeksi_${jenisText}_${formattedDateTime}.xlsx`;
    
        XLSX.writeFile(workbook, fileName);
        addLog(LogAction.EXPORT, LogEntity.INTROSPEKSI, `Mengekspor ${dataToExport.length} data introspeksi.`);
      };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Introspeksi</h1>

                <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Left side: Filters */}
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                            <input
                                type="search"
                                placeholder="Cari deskripsi perbaikan..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md md:w-64 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            />
                            <select
                                value={jenisFilter}
                                onChange={e => { setJenisFilter(e.target.value as JenisPerbaikan | 'all'); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md md:w-52 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Semua Jenis Perbaikan</option>
                                <option value={JenisPerbaikan.MUDAH}>Mudah</option>
                                <option value={JenisPerbaikan.CUKUP}>Cukup</option>
                                <option value={JenisPerbaikan.SULIT}>Sulit</option>
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
                                  onClick={handleAdd}
                                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm md:w-auto hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              >
                                  <PlusIcon className="w-5 h-5 mr-2 -ml-1" />
                                  Tambah Introspeksi
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
                                <th scope="col" className="w-5/12 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Deskripsi Perbaikan</th>
                                <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Jenis</th>
                                <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Poin</th>
                                {!isGuru && <th scope="col" className="w-2/12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {paginatedData.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                    <td className="px-6 py-4 text-sm text-left text-gray-900 dark:text-white">{item.desk_perbaikan}</td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap"><JenisPerbaikanBadge jenis={item.jenis_perbaikan} /></td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900 whitespace-nowrap dark:text-white">{item.point_perbaikan}</td>
                                    {!isGuru && (
                                      <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                          <button onClick={() => handleEdit(item)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                                          {(user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN) && (
                                              <button onClick={() => handleDelete(item)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete"><TrashIcon className="w-5 h-5" /></button>
                                          )}
                                      </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={!isGuru ? 5 : 4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
                        <div className="hidden sm:block">
                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedData.length)}</span> of{' '}
                                <span className="font-medium">{filteredAndSortedData.length}</span> results
                            </p>
                        </div>
                        <div className="flex justify-between flex-1 sm:justify-end">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
                        </div>
                    </nav>
                )}
            </div>
            
            <IntrospeksiFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setError(null); }}
                onSave={handleSave}
                initialData={editingData}
                error={error}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Introspeksi"
                message={`Apakah Anda yakin ingin menghapus "${dataToDelete?.desk_perbaikan}" secara permanen?`}
            />
        </>
    );
};

export default IntrospeksiPage;
