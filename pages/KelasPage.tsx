import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { Kelas, Tingkat, Role, User, Sanksi, Introspeksi, Bimbingan, Pelanggaran, LogAction, LogEntity } from '../types';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import KelasFormModal from '../components/KelasFormModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Avatar } from '../components/Avatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const ITEMS_PER_PAGE = 10;

enum KondisiStatus {
    UNGGUL = 'Normal',
    AMAN = 'Perlu Pengawasan',
    PERHATIAN = 'Perlakuan Khusus',
    BERMASALAH = 'Kondisi Kritis',
}

const KelasPage: React.FC = () => {
  const { kelas, users, siswa, pelanggaran, bimbingan, sanksi, introspeksi, addKelas, updateKelas, deleteKelas, user: currentUser, addLog } = useAuth();
  const { settings } = useSettings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState<Tingkat | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [kelasToDelete, setKelasToDelete] = useState<Kelas | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKelas, setSelectedKelas] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const isGuru = currentUser?.role === Role.GURU;

  const guruList = useMemo(() => users.filter(u => u.role === Role.GURU), [users]);
  const guruMap = useMemo(() => new Map(users.map(u => [u.username, u])), [users]);

  const pelanggarPerKelasMap = useMemo(() => {
    const siswaDenganPelanggaran = new Set(pelanggaran.map(p => p.nipd));
    const counts = new Map<number, number>();

    siswa.forEach(s => {
        if (s.id_kelas && siswaDenganPelanggaran.has(s.nipd)) {
            counts.set(s.id_kelas, (counts.get(s.id_kelas) || 0) + 1);
        }
    });

    return counts;
  }, [pelanggaran, siswa]);

  const filteredKelas = useMemo(() => {
    const tingkatOrder: Record<Tingkat, number> = {
      [Tingkat.X]: 1,
      [Tingkat.XI]: 2,
      [Tingkat.XII]: 3,
    };

    return kelas
      .filter(k => k.kelas.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(k => tingkatFilter === 'all' ? true : k.tingkat === tingkatFilter)
      .sort((a, b) => {
        const orderA = tingkatOrder[a.tingkat];
        const orderB = tingkatOrder[b.tingkat];
        if (orderA !== orderB) return orderA - orderB;
        return a.kelas.localeCompare(b.kelas);
      });
  }, [kelas, searchTerm, tingkatFilter]);

  const totalPages = Math.ceil(filteredKelas.length / ITEMS_PER_PAGE);

  const paginatedKelas = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredKelas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredKelas, currentPage]);
  
  const siswaSummaryData = useMemo(() => {
    const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
    const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));

    const studentStats = new Map<string, { pelanggaranPoints: number; perbaikanPoints: number }>();

    pelanggaran.forEach(p => {
        const s = sanksiMap.get(p.id_sanksi);
        if(s) {
            const current = studentStats.get(p.nipd) || { pelanggaranPoints: 0, perbaikanPoints: 0 };
            current.pelanggaranPoints += s.point_pelanggar;
            studentStats.set(p.nipd, current);
        }
    });
    
    bimbingan.forEach(b => {
        const i = introspeksiMap.get(b.id_perbaikan);
        if(i) {
            const current = studentStats.get(b.nipd) || { pelanggaranPoints: 0, perbaikanPoints: 0 };
            current.perbaikanPoints += i.point_perbaikan;
            studentStats.set(b.nipd, current);
        }
    });
    
    const allSiswa = users.filter(u => u.role === Role.SISWA);
    return allSiswa.map(u => {
        const stats = studentStats.get(u.username) || { pelanggaranPoints: 0, perbaikanPoints: 0 };
        const totalPoint = Math.max(0, stats.pelanggaranPoints - stats.perbaikanPoints);

        let kondisi: KondisiStatus;
        if (totalPoint <= settings.pointThresholds.aman) kondisi = KondisiStatus.UNGGUL;
        else if (totalPoint <= 29) kondisi = KondisiStatus.AMAN;
        else if (totalPoint <= settings.pointThresholds.perhatian) kondisi = KondisiStatus.PERHATIAN;
        else kondisi = KondisiStatus.BERMASALAH;

        return {
            nipd: u.username,
            nama_siswa: u.nama,
            total_pelanggaran: stats.pelanggaranPoints,
            total_perbaikan: stats.perbaikanPoints,
            total_point: totalPoint,
            kondisi: kondisi,
        };
    });
  }, [users, pelanggaran, bimbingan, sanksi, introspeksi, settings.pointThresholds]);

  const handleSelectOne = (kelasId: number) => {
      setSelectedKelas(prev => {
          const newSet = new Set(prev);
          if (newSet.has(kelasId)) {
              newSet.delete(kelasId);
          } else {
              newSet.add(kelasId);
          }
          return newSet;
      });
  };

  const handleSelectAll = () => {
    setSelectedKelas(prev => {
        const currentIds = new Set(paginatedKelas.map(k => k.id));
        if (paginatedKelas.every(k => prev.has(k.id))) {
            // Deselect all
            const newSet = new Set(prev);
            currentIds.forEach(id => newSet.delete(id));
            return newSet;
        } else {
            // Select all
            return new Set([...prev, ...currentIds]);
        }
    });
  };

  const isAllSelected = paginatedKelas.length > 0 && paginatedKelas.every(k => selectedKelas.has(k.id));

  const handleExportPdf = async () => {
    setIsExporting(true);
    const doc = new jsPDF();
    const kelasToExport = selectedKelas.size > 0 
        ? kelas.filter(k => selectedKelas.has(k.id)) 
        : filteredKelas;

    const siswaDiKelasMap = new Map<number, string[]>();
    siswa.forEach(s => {
        if(s.id_kelas) {
            if(!siswaDiKelasMap.has(s.id_kelas)) siswaDiKelasMap.set(s.id_kelas, []);
            siswaDiKelasMap.get(s.id_kelas)?.push(s.nipd);
        }
    });
    
    const summaryMap = new Map(siswaSummaryData.map(s => [s.nipd, s]));

    for (let i = 0; i < kelasToExport.length; i++) {
        const k = kelasToExport[i];
        if (i > 0) doc.addPage();
        
        const currentYear = new Date().getFullYear();
        const tahunPelajaran = `${currentYear}/${currentYear + 1}`;
        doc.setFontSize(16).setFont(undefined, 'bold');
        doc.text(`Laporan Kelas - ${settings.appName}`, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(12).setFont(undefined, 'normal');
        doc.text(`Tahun Pelajaran ${tahunPelajaran}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        const guru = k.id_guru ? guruMap.get(k.id_guru) : null;
        doc.setFontSize(11).setFont(undefined, 'bold');
        doc.text(`Kelas: ${k.kelas}`, 14, 35);
        doc.text(`Wali Kelas: ${guru?.nama || '-'}`, 14, 42);

        const nipdSiswaDiKelas = siswaDiKelasMap.get(k.id) || [];
        const studentDataForTable = nipdSiswaDiKelas
            .map(nipd => summaryMap.get(nipd))
            .filter((s): s is typeof siswaSummaryData[0] => !!s)
            .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa))
            .map((s, idx) => [
                idx + 1,
                `${s.nama_siswa}\n${s.nipd}`,
                s.total_pelanggaran,
                s.total_perbaikan,
                s.total_point,
                s.kondisi
            ]);
            
        autoTable(doc, {
            startY: 50,
            head: [['No.', 'Siswa', 'Pelanggaran', 'Perbaikan', 'Total Point', 'Kondisi']],
            body: studentDataForTable,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], halign: 'center' },
            columnStyles: {
                0: { halign: 'center' },
                1: { cellWidth: 60, halign: 'left' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
            },
        });
    }

    const fileName = `Laporan_Kelas_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    addLog(LogAction.EXPORT, LogEntity.LAPORAN, `Mengekspor laporan PDF untuk ${kelasToExport.length} kelas.`);
    setIsExporting(false);
  };

  const handleAddKelas = () => { setError(null); setEditingKelas(null); setIsFormModalOpen(true); };
  const handleEditKelas = (k: Kelas) => { setError(null); setEditingKelas(k); setIsFormModalOpen(true); };
  const handleDeleteKelas = (k: Kelas) => { setKelasToDelete(k); setIsConfirmModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (kelasToDelete) {
      await deleteKelas(kelasToDelete.id);
      setIsConfirmModalOpen(false);
      setKelasToDelete(null);
    }
  };

  const handleSaveKelas = async (kelasToSave: Omit<Kelas, 'id'> | Kelas) => {
    setError(null);
    try {
      if ('id' in kelasToSave) await updateKelas(kelasToSave);
      else await addKelas(kelasToSave);
      setIsFormModalOpen(false);
      setEditingKelas(null);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Kelas</h1>

        <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Left side: Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <input
                        type="search"
                        placeholder="Cari nama kelas..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md md:w-64 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                    <select
                        value={tingkatFilter}
                        onChange={e => { setTingkatFilter(e.target.value as Tingkat | 'all'); setCurrentPage(1); }}
                        className="w-full px-3 py-2 text-center text-gray-900 bg-gray-50 border border-gray-300 rounded-md md:w-48 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">Semua Tingkat</option>
                        <option value={Tingkat.X}>Tingkat X</option>
                        <option value={Tingkat.XI}>Tingkat XI</option>
                        <option value={Tingkat.XII}>Tingkat XII</option>
                    </select>
                </div>

                {/* Right side: Actions */}
                {!isGuru && (
                  <div className="flex items-center space-x-2">
                      <button
                          onClick={handleAddKelas}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                          <PlusIcon className="w-5 h-5 mr-2 -ml-1" /> Tambah
                      </button>
                      <button
                          onClick={handleExportPdf}
                          disabled={isExporting}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                          <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                          {isExporting ? 'Mengekspor...' : `Export PDF ${selectedKelas.size > 0 ? `(${selectedKelas.size})` : ''}`}
                      </button>
                  </div>
                )}
            </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {!isGuru && (
                  <th scope="col" className="p-4">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-900 dark:border-gray-600 dark:checked:bg-primary-500" checked={isAllSelected} onChange={handleSelectAll} />
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">No.</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Kelas</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Tingkat</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Wali Kelas</th>
                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Jml Pelanggar</th>
                {!isGuru && <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {paginatedKelas.map((k, index) => {
                const guru = k.id_guru ? guruMap.get(k.id_guru) : null;
                const jumlahPelanggar = pelanggarPerKelasMap.get(k.id) || 0;
                return (
                    <tr key={k.id} className={`transition-colors duration-150 ${selectedKelas.has(k.id) ? 'bg-primary-100 dark:bg-primary-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {!isGuru && (
                          <td className="p-4">
                              <input type="checkbox" className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-900 dark:border-gray-600 dark:checked:bg-primary-500" checked={selectedKelas.has(k.id)} onChange={() => handleSelectOne(k.id)}/>
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-center text-gray-900 whitespace-nowrap dark:text-white">{k.kelas}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{k.tingkat}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {guru ? (
                                <div className="flex items-center"><Avatar user={guru} className="w-10 h-10 mr-4 rounded-full" /><div className="text-sm"><div className="font-medium text-gray-900 dark:text-white">{guru.nama}</div><div className="text-gray-500 font-mono dark:text-gray-400">{guru.username}</div></div></div>
                            ) : ( <span className="text-sm text-gray-500 dark:text-gray-400">-</span> )}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-center text-red-600 whitespace-nowrap dark:text-red-400">
                            {jumlahPelanggar > 0 ? jumlahPelanggar : '-'}
                        </td>
                        {!isGuru && (
                          <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                              <button onClick={() => handleEditKelas(k)} className="p-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200" title="Edit"><PencilIcon className="w-5 h-5"/></button>
                              {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SUPER_ADMIN) && ( <button onClick={() => handleDeleteKelas(k)} className="p-1 ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Delete"><TrashIcon className="w-5 h-5" /></button> )}
                          </td>
                        )}
                    </tr>
                );
              })}
              {paginatedKelas.length === 0 && ( <tr><td colSpan={!isGuru ? 7 : 5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No classes found.</td></tr> )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
            <div className="hidden sm:block"><p className="text-sm text-gray-700 dark:text-gray-400">Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredKelas.length)}</span> of <span className="font-medium">{filteredKelas.length}</span> results</p></div>
            <div className="flex justify-between flex-1 sm:justify-end">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
            </div>
          </nav>
        )}
      </div>

      <KelasFormModal isOpen={isFormModalOpen} onClose={() => { setIsFormModalOpen(false); setError(null); }} onSave={handleSaveKelas} initialData={editingKelas} guruList={guruList} error={error} />
      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Konfirmasi Hapus Kelas" message={`Apakah Anda yakin ingin menghapus kelas "${kelasToDelete?.kelas}" secara permanen? Tindakan ini tidak dapat diurungkan.`} />
    </>
  );
};

export default KelasPage;
