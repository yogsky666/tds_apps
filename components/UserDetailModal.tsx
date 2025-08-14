import React, { useState, useCallback, useMemo } from 'react';
import { User, Role, Pelanggaran, Bimbingan, Sanksi, Introspeksi, Kelas, AppSettings } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { CameraIcon } from './icons/CameraIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { Avatar, stringToColor, getContrastColor } from './Avatar';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import jsPDF from 'jspdf';

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
  onUpdatePhoto: (username: string, photo: string) => Promise<void>;
}

const addImageFromUrl = async (doc: jsPDF, url: string, x: number, y: number, width: number, height: number, placeholderText: string = 'No Photo') => {
    const drawPlaceholder = () => {
        doc.setDrawColor(150);
        doc.rect(x, y, width, height);
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text(placeholderText, x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' });
    };

    if (!url) {
        drawPlaceholder();
        return;
    }

    if (url.startsWith('data:')) {
        try {
            const imageProps = doc.getImageProperties(url);
            doc.addImage(url, imageProps.fileType, x, y, width, height);
        } catch (e) {
            console.error("Failed to add data URL to PDF:", e);
            drawPlaceholder();
        }
        return;
    }
    
    // Workaround for CORS issues when fetching images from external URLs
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Network response was not ok. Status: ${response.status}`);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        const imageProps = doc.getImageProperties(dataUrl);
        doc.addImage(dataUrl, imageProps.fileType, x, y, width, height);
    } catch (e) {
        console.error("Could not add image from URL (via proxy):", e);
        drawPlaceholder();
    }
};

const addLetterhead = async (doc: jsPDF, settings: AppSettings): Promise<number> => {
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;
    const logoSize = 25;

    if (settings.kopSurat.logo) {
        await addImageFromUrl(doc, settings.kopSurat.logo, margin, y, logoSize, logoSize, 'No Logo');
    }
    
    const textBlockXStart = margin + logoSize + 5;
    const textCenterX = textBlockXStart + (pageWidth - textBlockXStart - margin) / 2;
    let currentY = y + 2;

    doc.setFont('times');

    if(settings.kopSurat.line1) { doc.setFontSize(11).setFont(undefined, 'normal').text(settings.kopSurat.line1, textCenterX, currentY, { align: 'center' }); currentY += 4; }
    if(settings.kopSurat.line2) { doc.setFontSize(12).setFont(undefined, 'normal').text(settings.kopSurat.line2, textCenterX, currentY, { align: 'center' }); currentY += 5; }
    if(settings.kopSurat.line3) { doc.setFontSize(12).setFont(undefined, 'normal').text(settings.kopSurat.line3, textCenterX, currentY, { align: 'center' }); currentY += 5; }
    if(settings.kopSurat.line4) { doc.setFontSize(16).setFont(undefined, 'bold').text(settings.kopSurat.line4, textCenterX, currentY, { align: 'center' }); currentY += 6; }
    if(settings.kopSurat.line5) { doc.setFontSize(16).setFont(undefined, 'bold').text(settings.kopSurat.line5, textCenterX, currentY, { align: 'center' }); currentY += 6; }
    if(settings.kopSurat.line6) { doc.setFontSize(9).setFont(undefined, 'normal').text(settings.kopSurat.line6, textCenterX, currentY, { align: 'center' }); currentY += 4; }
    if(settings.kopSurat.line7) { doc.setFontSize(9).setFont(undefined, 'normal').text(settings.kopSurat.line7, textCenterX, currentY, { align: 'center' }); currentY += 4; }
    if(settings.kopSurat.line8) { doc.setFontSize(9).setFont(undefined, 'normal').text(settings.kopSurat.line8, textCenterX, currentY, { align: 'center' }); }


    const bottomY = Math.max(margin + logoSize, currentY);
    y = bottomY + 2;
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    
    return y + 8;
};

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onUpdatePhoto }) => {
  const { pelanggaran, bimbingan, sanksi, introspeksi, users, kelas, siswa } = useAuth();
  const { settings } = useSettings();
  
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const sanksiMap = useMemo(() => new Map(sanksi.map(s => [s.id, s])), [sanksi]);
  const introspeksiMap = useMemo(() => new Map(introspeksi.map(i => [i.id, i])), [introspeksi]);

  const studentInfo = useMemo(() => {
    if (!user) return null;
    
    const studentRelation = siswa.find(s => s.nipd === user.username);
    if (!studentRelation) return { studentClass: null, homeroomTeacher: null };
    
    const studentClass = studentRelation.id_kelas ? kelas.find(k => k.id === studentRelation.id_kelas) : null;
    if (!studentClass) return { studentClass: studentClass || null, homeroomTeacher: null };

    const homeroomTeacher = studentClass.id_guru ? users.find(u => u.username === studentClass.id_guru) : null;
    
    return { studentClass, homeroomTeacher };
  }, [user, siswa, kelas, users]);

  const filteredPelanggaran = useMemo(() => {
    if (!user) return [];
    return pelanggaran
      .filter(p => {
        if (p.nipd !== user.username) return false;
        if (!startDate && !endDate) return true;
        const pDate = p.tanggal;
        if (startDate && endDate) return pDate >= startDate && pDate <= endDate;
        if (startDate) return pDate >= startDate;
        if (endDate) return pDate <= endDate;
        return true;
      })
      .map(p => ({
          pelanggaran: p,
          sanksi: sanksiMap.get(p.id_sanksi)
      }))
      .filter((p): p is { pelanggaran: Pelanggaran, sanksi: Sanksi } => !!p.sanksi)
      .sort((a,b) => new Date(b.pelanggaran.tanggal).getTime() - new Date(a.pelanggaran.tanggal).getTime());
  }, [user, pelanggaran, sanksiMap, startDate, endDate]);
  
  const totalPelanggaranPoints = useMemo(() => {
    return filteredPelanggaran.reduce((sum, item) => sum + item.sanksi.point_pelanggar, 0);
  }, [filteredPelanggaran]);

  const filteredBimbingan = useMemo(() => {
    if (!user) return [];
     return bimbingan
      .filter(b => {
        if (b.nipd !== user.username) return false;
        if (!startDate && !endDate) return true;
        const bDate = b.tanggal;
        if (startDate && endDate) return bDate >= startDate && bDate <= endDate;
        if (startDate) return bDate >= startDate;
        if (endDate) return bDate <= endDate;
        return true;
      })
      .map(b => ({
          bimbingan: b,
          perbaikan: introspeksiMap.get(b.id_perbaikan)
      }))
      .filter((b): b is { bimbingan: Bimbingan, perbaikan: Introspeksi } => !!b.perbaikan)
      .sort((a,b) => new Date(b.bimbingan.tanggal).getTime() - new Date(a.bimbingan.tanggal).getTime());
  }, [user, bimbingan, introspeksiMap, startDate, endDate]);

  const totalBimbinganPoints = useMemo(() => {
    return filteredBimbingan.reduce((sum, item) => sum + item.perbaikan.point_perbaikan, 0);
  }, [filteredBimbingan]);

  const headerBgColor = useMemo(() => user ? stringToColor(user.username) : '#ffffff', [user]);
  const headerTextColor = useMemo(() => getContrastColor(headerBgColor), [headerBgColor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { // 1MB limit
              setError('File size must be under 1MB.');
              setPreviewSrc(null);
              return;
          }
          setError(null);
          const reader = new FileReader();
          reader.onloadend = () => {
              setPreviewSrc(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };
  
  const handleSavePhoto = async () => {
    if (!user || !previewSrc) return;
    setIsUploading(true);
    try {
        await onUpdatePhoto(user.username, previewSrc);
        setPreviewSrc(null);
    } catch(err) {
        setError("Failed to save photo. Please try again.");
        console.error(err);
    } finally {
        setIsUploading(false);
    }
  };


  const handleClose = useCallback(() => {
    setError(null);
    setPreviewSrc(null);
    setIsUploading(false);
    setStartDate('');
    setEndDate('');
    onClose();
  }, [onClose]);

  const generatePdf = async (type: 'pelanggaran' | 'bimbingan') => {
    if (!user || !studentInfo) return;

    const f4Width = 210;
    const f4Height = 330;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [f4Width, f4Height]
    });
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let y = margin + 10; // Start y position for content, providing a top margin.

    const addPageFooter = () => {
        const totalPages = (doc.internal as any).getNumberOfPages();
        const now = new Date();
        const datePart = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const timePart = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':');
        const timestamp = `${datePart} ${timePart}`;

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(timestamp, margin, pageHeight - 10, { align: 'left' });
            const pageNumText = `Page ${i} of ${totalPages}`;
            doc.text(pageNumText, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
    };

    const addTableHeader = (currentY: number) => {
        let newY = currentY;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setDrawColor(0);
        
        doc.setLineWidth(0.5);
        doc.line(margin, newY, pageWidth - margin, newY);
        newY += 6;

        doc.text("Tanggal", margin, newY);
        doc.text("Deskripsi", margin + 35, newY);
        doc.text("Poin", pageWidth - margin, newY, { align: 'right' });
        newY += 2;
        
        doc.setLineWidth(0.2);
        doc.line(margin, newY, pageWidth - margin, newY);
        newY += 5;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        return newY;
    };

    // --- PDF CONTENT START ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    const title = type === 'pelanggaran' ? 'Laporan Pelanggaran Siswa' : 'Laporan Bimbingan & Perbaikan';
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Student Info Header
    const infoStartY = y;
    const photoSize = 30;
    
    await addImageFromUrl(doc, user.photo || '', pageWidth - margin - photoSize, infoStartY, photoSize, photoSize);
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    const infoCol1X = margin;
    const infoCol2X = margin + 25;
    let infoY = infoStartY;

    const addInfoRow = (label: string, value: string) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, infoCol1X, infoY);
        doc.setFont(undefined, 'normal');
        doc.text(`: ${value}`, infoCol2X, infoY);
        infoY += 6;
    };
    
    addInfoRow('Nama', user.nama);
    addInfoRow('NIPD', user.username);
    addInfoRow('Kelas', studentInfo.studentClass?.kelas || 'Tidak Terdaftar');
    addInfoRow('Wali Kelas', studentInfo.homeroomTeacher?.nama || '-');

    y = Math.max(infoY, infoStartY + photoSize) + 5;
    
    y += 5;
    y = addTableHeader(y); // Draw first table header
    
    const data = type === 'pelanggaran' ? filteredPelanggaran : filteredBimbingan;
    data.forEach(item => {
        const contentWidth = pageWidth - margin * 2;
        const deskripsi = 'sanksi' in item ? item.sanksi.desk_kesalahan : item.perbaikan.desk_perbaikan;
        const deskripsiLines = doc.splitTextToSize(deskripsi, contentWidth - 35 - 20);
        const rowHeight = (deskripsiLines.length * 5) + 4;

        if (y + rowHeight > pageHeight - 20) {
            doc.addPage();
            y = margin;
            y = addTableHeader(y); // Repeat header on new page
        }
        
        const dateStr = 'pelanggaran' in item 
            ? new Date(item.pelanggaran.tanggal + 'T00:00:00').toLocaleDateString('id-ID')
            : new Date(item.bimbingan.tanggal + 'T00:00:00').toLocaleDateString('id-ID');
        
        const poin = 'sanksi' in item ? `-${item.sanksi.point_pelanggar}` : `+${item.perbaikan.point_perbaikan}`;
        
        doc.text(dateStr, margin, y);
        doc.text(deskripsiLines, margin + 35, y);
        doc.text(poin, pageWidth - margin, y, { align: 'right' });

        y += rowHeight;
    });

    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    const totalPoints = type === 'pelanggaran' ? totalPelanggaranPoints : totalBimbinganPoints;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Poin: ${type === 'pelanggaran' ? '-' : '+'}${totalPoints}`, pageWidth - margin, y, { align: 'right'});

    // --- PDF CONTENT END ---
    
    addPageFooter();

    const reportType = type;
    const kelasStr = studentInfo.studentClass?.kelas.replace(/\s/g, '_') || 'Tanpa_Kelas';
    const siswaStr = user.nama.replace(/\s/g, '_');
    const fileName = `Report_${reportType}_${kelasStr}_${siswaStr}.pdf`;

    doc.save(fileName);
  };

  if (!user) return null;

  return (
    <>
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
        onClick={handleClose}
    >
        <div 
            className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
        >
            {/* Header Section */}
            <div
                className="relative p-6 text-center rounded-t-2xl"
                style={{ backgroundColor: headerBgColor }}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 bg-transparent rounded-full opacity-80 hover:opacity-100"
                    aria-label="Close"
                    style={{ color: headerTextColor }}
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="relative inline-block">
                    <Avatar 
                        user={user}
                        className="w-28 h-28 rounded-full ring-4 ring-white dark:ring-gray-800"
                    />
                     <label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full cursor-pointer hover:bg-primary-700 text-white shadow-md">
                        <CameraIcon className="w-4 h-4" />
                        <input id="photo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} />
                    </label>
                </div>
                <h2 id="modal-title" className="mt-4 text-2xl font-bold" style={{ color: headerTextColor }}>
                    {user.nama}
                </h2>
                <div className="mt-2">
                     <span className={`px-3 py-1 text-sm font-semibold capitalize rounded-full bg-white/30`} style={{color: headerTextColor}}>
                        {user.role}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 pb-6 pt-6 max-h-[60vh] overflow-y-auto">
                {error && <p className="mt-4 text-sm text-center text-red-500">{error}</p>}
                {previewSrc && (
                    <div className="p-4 mt-4 text-center bg-gray-100 rounded-lg dark:bg-gray-700">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Pratinjau Foto Baru</p>
                        <img src={previewSrc} alt="New photo preview" className="object-cover w-32 h-32 mx-auto my-2 rounded-full" />
                        <div className="flex justify-center space-x-3">
                             <button
                                type="button"
                                onClick={() => setPreviewSrc(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSavePhoto}
                                disabled={isUploading}
                                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800"
                            >
                                {isUploading ? 'Menyimpan...' : 'Simpan Foto'}
                            </button>
                        </div>
                    </div>
                )}
              
                <div className="mt-6 space-y-4 text-left">
                    <div className="flex items-center p-3 transition-colors bg-gray-100 rounded-lg dark:bg-gray-700/50">
                        <IdentificationIcon className="w-6 h-6 text-primary-500 dark:text-primary-400" />
                        <div className="ml-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Username (NIP/NIK/NISN)</p>
                            <p className="font-mono text-gray-800 dark:text-gray-200">{user.username}</p>
                        </div>
                    </div>
                    <div className="flex items-center p-3 transition-colors bg-gray-100 rounded-lg dark:bg-gray-700/50">
                         <svg className="w-6 h-6 text-primary-500 dark:text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                        <div className="ml-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Jenis Kelamin</p>
                            <p className="text-gray-800 capitalize dark:text-gray-200">{user.jenis_kelamin}</p>
                        </div>
                    </div>
                </div>

                {user.role === Role.SISWA && (
                  <div className="mt-6">
                    <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-900/50">
                        <h3 className="mb-4 text-lg font-bold text-center text-gray-900 dark:text-white">Laporan Kedisiplinan</h3>
                        
                        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Awal</label>
                                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tanggal Akhir</label>
                                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                            </div>
                        </div>

                        {/* Pelanggaran Section */}
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Laporan Pelanggaran</h4>
                                <button onClick={() => generatePdf('pelanggaran')} className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    <DownloadIcon className="w-4 h-4 mr-1"/> Unduh PDF
                                </button>
                            </div>
                            <div className="space-y-2">
                                {filteredPelanggaran.length > 0 ? filteredPelanggaran.map(({ pelanggaran, sanksi }) => (
                                    <div key={pelanggaran.id} className="flex items-start justify-between p-3 bg-white rounded-md dark:bg-gray-700/50">
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{sanksi.desk_kesalahan}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(pelanggaran.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <p className="ml-4 font-bold text-red-500 whitespace-nowrap">-{sanksi.point_pelanggar}</p>
                                    </div>
                                )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400">Tidak ada data pelanggaran.</p>}
                            </div>
                            <div className="p-2 mt-2 text-right bg-gray-100 rounded-md dark:bg-gray-800">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total Poin Pelanggaran: </span>
                                <span className="font-bold text-red-500">-{totalPelanggaranPoints}</span>
                            </div>
                        </div>

                        {/* Bimbingan Section */}
                        <div className='mt-6'>
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Laporan Bimbingan & Perbaikan</h4>
                                <button onClick={() => generatePdf('bimbingan')} className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    <DownloadIcon className="w-4 h-4 mr-1"/> Unduh PDF
                                </button>
                            </div>
                            <div className="space-y-2">
                                {filteredBimbingan.length > 0 ? filteredBimbingan.map(({ bimbingan, perbaikan }) => (
                                    <div key={bimbingan.id} className="flex items-start justify-between p-3 bg-white rounded-md dark:bg-gray-700/50">
                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{perbaikan.desk_perbaikan}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(bimbingan.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <p className="ml-4 font-bold text-green-500 whitespace-nowrap">+{perbaikan.point_perbaikan}</p>
                                    </div>
                                )) : <p className="text-sm text-center text-gray-500 dark:text-gray-400">Tidak ada data bimbingan.</p>}
                            </div>
                            <div className="p-2 mt-2 text-right bg-gray-100 rounded-md dark:bg-gray-800">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total Poin Perbaikan: </span>
                                <span className="font-bold text-green-500">+{totalBimbinganPoints}</span>
                            </div>
                        </div>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-3 font-semibold text-gray-700 transition-colors duration-200 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-100 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
    </>
  );
};

export default UserDetailModal;