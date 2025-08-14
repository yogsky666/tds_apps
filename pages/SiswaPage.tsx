import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { User, Kelas, Tingkat, Siswa, Role, Pelanggaran, Bimbingan, Introspeksi, AppSettings } from '../types';
import { Avatar } from '../components/Avatar';
import UserDetailModal from '../components/UserDetailModal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import SiswaAddModal from '../components/SiswaAddModal';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

enum KondisiStatus {
    UNGGUL = 'Normal',
    AMAN = 'Perlu Pengawasan',
    PERHATIAN = 'Perlakuan Khusus',
    BERMASALAH = 'Kondisi Kritis',
}

const KondisiBadge: React.FC<{ kondisi: KondisiStatus }> = ({ kondisi }) => {
    const colors: Record<KondisiStatus, string> = {
        [KondisiStatus.UNGGUL]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [KondisiStatus.AMAN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [KondisiStatus.PERHATIAN]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [KondisiStatus.BERMASALAH]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[kondisi]}`}>
            {kondisi}
        </span>
    );
};


interface SiswaSummaryData {
    user: User;
    kelas: Kelas | null;
    totalPelanggaran: number;
    totalPerbaikan: number;
    totalPoint: number;
    kondisi: KondisiStatus;
}

const addImageFromUrl = async (doc: jsPDF, url: string, x: number, y: number, width: number, height: number) => {
    const drawPlaceholder = () => {
        doc.setDrawColor(150);
        doc.rect(x, y, width, height);
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text('No Logo', x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' });
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
    const logoSize = 25 * 1.3; // Enlarge by 0.3x
    const logoX = margin + 10; // Move left a bit, now 1cm from margin

    if (settings.kopSurat.logo) {
        await addImageFromUrl(doc, settings.kopSurat.logo, logoX, y, logoSize, logoSize);
    }
    
    const textCenterX = pageWidth / 2 + 10; // Move text right by 1cm
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

    const bottomY = Math.max(y + logoSize, currentY);
    y = bottomY + 2;
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    
    return y + 10;
};


const SiswaPage: React.FC = () => {
    const { users, kelas, siswa, updateUserPhoto, sanksi, pelanggaran, bimbingan, introspeksi, addSiswa, updateSiswa, assignSiswaToKelasBulk, user: currentUser } = useAuth();
    const { settings } = useSettings();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [tingkatFilter, setTingkatFilter] = useState<Tingkat | 'all'>('all');
    const [kelasFilter, setKelasFilter] = useState<number | 'all'>('all');
    const [kondisiFilter, setKondisiFilter] = useState<KondisiStatus | 'all'>('all');
    const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD format
    const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD format
    const [currentPage, setCurrentPage] = useState(1);
    
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAddSiswaModalOpen, setIsAddSiswaModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const importFileRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const isGuru = currentUser?.role === Role.GURU;

    const siswaSummaryData: SiswaSummaryData[] = useMemo(() => {
        const kelasMap = new Map(kelas.map(k => [k.id, k]));
        const siswaKelasMap = new Map(siswa.map(s => [s.nipd, s.id_kelas]));
        const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
        const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));

        const studentStats = new Map<string, { pelanggaranPoints: number; perbaikanPoints: number }>();

        const getStats = (nipd: string) => studentStats.get(nipd) || { pelanggaranPoints: 0, perbaikanPoints: 0 };

        const filteredPelanggaran = pelanggaran.filter(p => {
            if (!startDate && !endDate) return true;
            if (startDate && endDate) return p.tanggal >= startDate && p.tanggal <= endDate;
            if (startDate) return p.tanggal >= startDate;
            if (endDate) return p.tanggal <= endDate;
            return true;
        });

        const filteredBimbingan = bimbingan.filter(b => {
             if (!startDate && !endDate) return true;
            if (startDate && endDate) return b.tanggal >= startDate && b.tanggal <= endDate;
            if (startDate) return b.tanggal >= startDate;
            if (endDate) return b.tanggal <= endDate;
            return true;
        });

        // Calculate violation points
        for (const p of filteredPelanggaran) {
            const currentStats = getStats(p.nipd);
            const sanksiInfo = sanksiMap.get(p.id_sanksi);
            
            if (sanksiInfo) {
                currentStats.pelanggaranPoints += sanksiInfo.point_pelanggar;
            }
            
            studentStats.set(p.nipd, currentStats);
        }
        
        // Calculate improvement points
        for (const b of filteredBimbingan) {
            const currentStats = getStats(b.nipd);
            const perbaikanInfo = introspeksiMap.get(b.id_perbaikan);

            if (perbaikanInfo) {
                currentStats.perbaikanPoints += perbaikanInfo.point_perbaikan;
            }
            
            studentStats.set(b.nipd, currentStats);
        }
        
        return users
            .filter(u => u.role === Role.SISWA)
            .map(u => {
                const idKelas = siswaKelasMap.get(u.username);
                const stats = studentStats.get(u.username) || { pelanggaranPoints: 0, perbaikanPoints: 0 };
                
                const totalPoint = Math.max(0, stats.pelanggaranPoints - stats.perbaikanPoints);

                let kondisi: KondisiStatus;
                if (totalPoint <= 29) {
                    kondisi = KondisiStatus.UNGGUL; // Normal
                } else if (totalPoint <= settings.pointThresholds.aman) {
                    kondisi = KondisiStatus.AMAN; // Perlu Pengawasan
                } else if (totalPoint <= settings.pointThresholds.perhatian) {
                    kondisi = KondisiStatus.PERHATIAN; // Perlakuan Khusus
                } else {
                    kondisi = KondisiStatus.BERMASALAH; // Kondisi Kritis
                }

                return {
                    user: u,
                    kelas: idKelas ? kelasMap.get(idKelas) || null : null,
                    totalPelanggaran: stats.pelanggaranPoints,
                    totalPerbaikan: stats.perbaikanPoints,
                    totalPoint: totalPoint,
                    kondisi: kondisi,
                };
            });
    }, [users, kelas, siswa, sanksi, pelanggaran, bimbingan, introspeksi, startDate, endDate, settings.pointThresholds]);

    const unassignedStudents = useMemo(() => {
        const assignedSiswaNipds = new Set(
            siswa.filter(s => s.id_kelas !== null).map(s => s.nipd)
        );
        return users.filter(u => u.role === Role.SISWA && !assignedSiswaNipds.has(u.username));
    }, [users, siswa]);

    const availableKelas = useMemo(() => {
        const filtered = tingkatFilter === 'all'
            ? kelas
            : kelas.filter(k => k.tingkat === tingkatFilter);
        
        return [...filtered].sort((a, b) => a.kelas.localeCompare(b.kelas));
    }, [kelas, tingkatFilter]);

    const filteredData = useMemo(() => {
        return siswaSummaryData
            .filter(s => s.user.nama.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(s => tingkatFilter === 'all' ? true : s.kelas?.tingkat === tingkatFilter)
            .filter(s => kelasFilter === 'all' ? true : s.kelas?.id === kelasFilter)
            .filter(s => kondisiFilter === 'all' ? true : s.kondisi === kondisiFilter)
            .sort((a, b) => a.user.nama.localeCompare(b.user.nama));
    }, [siswaSummaryData, searchTerm, tingkatFilter, kelasFilter, kondisiFilter]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);
    
    const handleRowClick = (user: User) => {
        setSelectedUser(user);
    };
    
    const handleAddSiswaToClass = () => {
        setError(null);
        setIsAddSiswaModalOpen(true);
    };

    const handleAssignSiswa = async (relasi: Siswa) => {
        setError(null);
        try {
            const existingRelasi = siswa.find(s => s.nipd === relasi.nipd);
            if (existingRelasi) {
                await updateSiswa(relasi);
            } else {
                await addSiswa(relasi);
            }
            setIsAddSiswaModalOpen(false);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred while saving.");
            }
        }
    };

    const handleDownloadTemplate = () => {
        const examples = unassignedStudents.slice(0, 2).map(student => ({
            nipd: student.username,
            kelas: '',
        }));

        const templateData = examples.length > 0 ? examples : [{ nipd: '0090123456', kelas: 'X IPA 1' }];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        worksheet['!cols'] = [{ wch: 25 }, { wch: 25 }];

        XLSX.utils.sheet_add_aoa(worksheet, [
            [],
            ["CATATAN:"],
            ["- Kolom 'nipd' harus berisi NIPD siswa yang valid dan sudah terdaftar."],
            ["- Kolom 'kelas' harus berisi nama kelas yang sudah ada di sistem (e.g., 'XI IPS 1')."],
            ["- File ini digunakan untuk menugaskan siswa ke kelas atau memindahkan siswa ke kelas baru."],
        ], { origin: `A${templateData.length + 2}` });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template Kelas Siswa");
        XLSX.writeFile(workbook, "template_penugasan_kelas.xlsx");
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

                const assignments: { nipd: string, id_kelas: number }[] = [];
                const errors: string[] = [];

                const kelasNameMap = new Map(kelas.map(k => [k.kelas.toLowerCase().trim(), k.id]));
                const validSiswaNipds = new Set(users.filter(u => u.role === Role.SISWA).map(u => u.username));
                
                for (const [index, row] of json.entries()) {
                    const nipd = row.nipd?.toString().trim();
                    const kelasName = row.kelas?.toString().trim();

                    if (!nipd || !kelasName) {
                        errors.push(`Baris ${index + 2}: NIPD atau nama kelas kosong.`);
                        continue;
                    }

                    if (!validSiswaNipds.has(nipd)) {
                        errors.push(`Baris ${index + 2}: NIPD "${nipd}" tidak ditemukan atau bukan siswa.`);
                        continue;
                    }

                    const lowerCaseKelasName = kelasName.toLowerCase();
                    if (!kelasNameMap.has(lowerCaseKelasName)) {
                        errors.push(`Baris ${index + 2}: Kelas "${kelasName}" tidak ditemukan.`);
                        continue;
                    }
                    assignments.push({ nipd, id_kelas: kelasNameMap.get(lowerCaseKelasName)! });
                }
                
                let successMessage = '';
                if (assignments.length > 0) {
                    const { successCount } = await assignSiswaToKelasBulk(assignments);
                    successMessage = `Berhasil menugaskan ${successCount} siswa ke kelas.`;
                }

                let errorMessage = errors.length > 0 ? `Gagal memproses ${errors.length} baris:\n- ${errors.slice(0, 5).join('\n- ')}` : '';
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

    const handleExportReport = () => {
        const dataToExport = filteredData.map((s, index) => ({
            'No.': index + 1,
            'Nama Siswa': s.user.nama,
            'NIPD': s.user.username,
            'Kelas': s.kelas?.kelas || 'Tidak Terdaftar',
            'Poin Pelanggaran': s.totalPelanggaran,
            'Poin Perbaikan': s.totalPerbaikan,
            'Total Poin': s.totalPoint,
            'Kondisi': s.kondisi,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const setColWidths = (worksheet: XLSX.WorkSheet, data: any[]) => {
            if (data.length > 0) {
                const cols = Object.keys(data[0]);
                worksheet['!cols'] = cols.map(col => ({ wch: Math.max(...data.map(row => (row[col]?.toString() ?? "").length), col.length) + 2 }));
            }
        };
        setColWidths(worksheet, dataToExport);
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ringkasan Siswa");

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `Ringkasan_Siswa_${dateStr}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
    };

    const handleGenerateSP = async (siswaData: SiswaSummaryData, spType: 'SP1' | 'SP2' | 'SP3') => {
        const f4Width = 210;
        const f4Height = 330;
        const margin = 10;
    
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [f4Width, f4Height]
        });
    
        let y = await addLetterhead(doc, settings);

        doc.setFontSize(16);
        doc.setFont('times', 'bold');
        doc.text('SURAT PANGGILAN', f4Width / 2, y, { align: 'center' });
        y += 8;
    
        doc.setFontSize(12);
        doc.setFont('times', 'normal');
        doc.text(`Nomor: .../SP/${spType}/...`, f4Width / 2, y, { align: 'center' });
        y += 8;

        doc.text('Kepada Yth.', margin, y); y+=5;
        doc.text('Bapak/Ibu Orang Tua/Wali dari:', margin, y); y+=10;
    
        doc.setFont('times', 'bold');
        doc.text(`${siswaData.user.nama}`, margin + 10, y); y += 5;
        doc.setFont('times', 'normal');
        doc.text(`NIPD: ${siswaData.user.username}`, margin + 10, y); y += 5;
        doc.text(`Kelas: ${siswaData.kelas?.kelas || 'Tidak Terdaftar'}`, margin + 10, y); y += 5;
        
        doc.text('di Tempat', margin, y); y += 10;
    
        doc.text('Dengan hormat,', margin, y); y += 10;
        doc.text(
            'Sehubungan dengan hasil evaluasi kedisiplinan siswa, dengan ini kami mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid untuk dapat hadir di sekolah pada:',
            margin,
            y,
            { maxWidth: f4Width - margin * 2 }
        );
        y += 15;
        
        doc.text('Hari/Tanggal : ..........................................', margin, y); y += 7;
        doc.text('Waktu         : ..........................................', margin, y); y += 7;
        doc.text('Tempat        : ..........................................', margin, y); y += 7;
    
        doc.text(
            'Adapun tujuan dari pertemuan ini adalah untuk membahas perkembangan dan perilaku ananda di sekolah.',
            margin,
            y,
            { maxWidth: f4Width - margin * 2 }
        );
        y += 10;
        
        let pointNote = `Siswa saat ini berada dalam kondisi "${siswaData.kondisi}" dengan total ${siswaData.totalPoint} poin (keseluruhan).`;
        if (startDate || endDate) {
            const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const startStr = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', formatOptions) : null;
            const endStr = endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID', formatOptions) : null;
            
            let periodeText = '';
            if (startStr && endStr) {
                periodeText = `untuk periode ${startStr} - ${endStr}`;
            } else if (startStr) {
                periodeText = `untuk periode sejak ${startStr}`;
            } else if (endStr) {
                periodeText = `untuk periode hingga ${endStr}`;
            }

            if(periodeText) {
                 pointNote = `Siswa saat ini berada dalam kondisi "${siswaData.kondisi}" dengan total ${siswaData.totalPoint} poin ${periodeText}.`;
            }
        }
        
        doc.text(
            `Catatan: ${pointNote}`,
            margin,
            y,
            { maxWidth: f4Width - margin * 2 }
        );
        y += 16;
    
        doc.text(
            'Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
            margin,
            y,
            { maxWidth: f4Width - margin * 2 }
        );
        y += 16;
    
        const signatureX = f4Width - margin - 50 - 20; // Move left by 2cm (20mm)
        doc.text('Hormat kami,', signatureX, y);
        y += 25;
        
        const signatory = settings.spSignatoryUsername ? users.find(u => u.username === settings.spSignatoryUsername) : null;
        if (signatory) {
            doc.text(signatory.nama, signatureX, y);
            y += 5;
            doc.text(`NIP. ${signatory.username}`, signatureX, y);
        } else {
            doc.text('..............................', signatureX, y);
        }
    
        doc.save(`Surat_Panggilan_${spType}_${siswaData.user.nama.replace(/\s/g, '_')}.pdf`);
    };

    const handleExportSiswaReport = (siswaData: SiswaSummaryData) => {
        const { user, kelas: studentClass } = siswaData;
    
        const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
        const pelanggaranRecords = pelanggaran
            .filter(p => p.nipd === user.username)
            .filter(p => {
                if (!startDate && !endDate) return true;
                if (startDate && endDate) return p.tanggal >= startDate && p.tanggal <= endDate;
                if (startDate) return p.tanggal >= startDate;
                if (endDate) return p.tanggal <= endDate;
                return true;
            })
            .map((p, index) => {
                const sanksiInfo = sanksiMap.get(p.id_sanksi);
                return {
                    'No.': index + 1,
                    'Tanggal': new Date(p.tanggal + 'T00:00:00').toLocaleDateString('id-ID'),
                    'Deskripsi Pelanggaran': sanksiInfo?.desk_kesalahan || 'N/A',
                    'Jenis Sanksi': sanksiInfo?.jenis_sanksi || 'N/A',
                    'Poin': sanksiInfo ? -sanksiInfo.point_pelanggar : 0,
                };
            });
        const pelanggaranWorksheet = XLSX.utils.json_to_sheet(pelanggaranRecords);
    
        const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));
        const perbaikanRecords = bimbingan
            .filter(b => b.nipd === user.username)
            .filter(b => {
                if (!startDate && !endDate) return true;
                if (startDate && endDate) return b.tanggal >= startDate && b.tanggal <= endDate;
                if (startDate) return b.tanggal >= startDate;
                if (endDate) return b.tanggal <= endDate;
                return true;
            })
            .map((b, index) => {
                const perbaikanInfo = introspeksiMap.get(b.id_perbaikan);
                return {
                    'No.': index + 1,
                    'Tanggal': new Date(b.tanggal + 'T00:00:00').toLocaleDateString('id-ID'),
                    'Deskripsi Perbaikan': perbaikanInfo?.desk_perbaikan || 'N/A',
                    'Jenis Perbaikan': perbaikanInfo?.jenis_perbaikan || 'N/A',
                    'Poin': perbaikanInfo ? perbaikanInfo.point_perbaikan : 0,
                };
            });
        const perbaikanWorksheet = XLSX.utils.json_to_sheet(perbaikanRecords);
    
        const setColWidths = (worksheet: XLSX.WorkSheet, data: any[]) => {
            if (data.length > 0) {
                const cols = Object.keys(data[0]);
                worksheet['!cols'] = cols.map(col => ({ wch: Math.max(...data.map(row => row[col]?.toString().length ?? 0), col.length) + 2 }));
            }
        };
        setColWidths(pelanggaranWorksheet, pelanggaranRecords);
        setColWidths(perbaikanWorksheet, perbaikanRecords);
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, pelanggaranWorksheet, "Pelanggaran");
        XLSX.utils.book_append_sheet(workbook, perbaikanWorksheet, "Perbaikan");
    
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const kelasStr = studentClass?.kelas.replace(/\s/g, '_') || 'Tanpa_Kelas';
        const siswaStr = user.nama.replace(/\s/g, '_');
        const fileName = `Report_${kelasStr}_${siswaStr}_${dateStr}.xlsx`;
    
        XLSX.writeFile(workbook, fileName);
    };

    const handleUpdatePhoto = async (username: string, photo: string) => {
        await updateUserPhoto(username, photo);
        setSelectedUser(prev => prev ? { ...prev, photo } : null);
    };

    const pointColorClass = (kondisi: KondisiStatus): string => {
        switch (kondisi) {
            case KondisiStatus.UNGGUL: return 'text-green-600 dark:text-green-400';
            case KondisiStatus.AMAN: return 'text-blue-600 dark:text-blue-400';
            case KondisiStatus.PERHATIAN: return 'text-yellow-600 dark:text-yellow-400';
            case KondisiStatus.BERMASALAH: return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-900 dark:text-white';
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manajemen Siswa</h1>
                
                <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <input
                                type="search"
                                placeholder="Cari nama siswa..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            />
                            <select
                                value={tingkatFilter}
                                onChange={e => {
                                    setTingkatFilter(e.target.value as Tingkat | 'all');
                                    setKelasFilter('all'); // Reset class filter when level changes
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Semua Tingkat</option>
                                <option value={Tingkat.X}>Tingkat X</option>
                                <option value={Tingkat.XI}>Tingkat XI</option>
                                <option value={Tingkat.XII}>Tingkat XII</option>
                            </select>
                             <select
                                value={kelasFilter}
                                onChange={e => { setKelasFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Semua Kelas</option>
                                {availableKelas.map(k => (
                                    <option key={k.id} value={k.id}>{k.kelas}</option>
                                ))}
                            </select>
                            <select
                                value={kondisiFilter}
                                onChange={e => { setKondisiFilter(e.target.value as KondisiStatus | 'all'); setCurrentPage(1); }}
                                className="w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="all">Semua Kondisi</option>
                                <option value={KondisiStatus.UNGGUL}>{KondisiStatus.UNGGUL}</option>
                                <option value={KondisiStatus.AMAN}>{KondisiStatus.AMAN}</option>
                                <option value={KondisiStatus.PERHATIAN}>{KondisiStatus.PERHATIAN}</option>
                                <option value={KondisiStatus.BERMASALAH}>{KondisiStatus.BERMASALAH}</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tanggal Awal
                                </label>
                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tanggal Akhir
                                </label>
                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                />
                            </div>
                        </div>

                        {!isGuru && (
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
                              <button onClick={handleDownloadTemplate} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                  <DownloadIcon className="w-5 h-5 mr-2 -ml-1" /> Template
                              </button>
                              <button onClick={handleImportClick} disabled={isImporting} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400">
                                  <UploadIcon className="w-5 h-5 mr-2 -ml-1" /> {isImporting ? 'Mengimpor...' : 'Import'}
                              </button>
                              <button onClick={handleExportReport} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                  <DownloadIcon className="w-5 h-5 mr-2 -ml-1" /> Export
                              </button>
                              <button onClick={handleAddSiswaToClass} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                  <PlusIcon className="w-5 h-5 mr-2 -ml-1" /> Tambah
                              </button>
                          </div>
                        )}

                        {importFeedback && (
                            <div className={`p-4 mt-4 text-sm rounded-lg ${importFeedback.type === 'success' ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200'}`} role="alert">
                                <p className="whitespace-pre-wrap font-medium">{importFeedback.message}</p>
                            </div>
                        )}
                    </div>
                </div>

                <input type="file" ref={importFileRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

                <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">No.</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-300">Kelas</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Siswa</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Pelanggaran</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Perbaikan</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Total Point</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Kondisi</th>
                                {!isGuru && <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Surat Panggilan</th>}
                                {!isGuru && <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-300">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {paginatedData.map((s, index) => (
                                <tr key={s.user.username} className="transition-colors duration-150 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleRowClick(s.user)}>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">
                                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-900 whitespace-nowrap dark:text-white">
                                        {s.kelas ? s.kelas.kelas : <span className="text-gray-400 italic">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 w-10 h-10">
                                                <Avatar user={s.user} className="w-10 h-10 rounded-full" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{s.user.nama}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{s.user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-red-600 whitespace-nowrap dark:text-red-400">{s.totalPelanggaran}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-center text-green-600 whitespace-nowrap dark:text-green-400">{s.totalPerbaikan}</td>
                                    <td className={`px-6 py-4 text-sm font-bold text-center whitespace-nowrap ${pointColorClass(s.kondisi)}`}>
                                        {s.totalPoint}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <KondisiBadge kondisi={s.kondisi} />
                                    </td>
                                    {!isGuru && (
                                      <td className="px-6 py-4 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center space-x-1">
                                              <button
                                                  onClick={(e) => { e.stopPropagation(); handleGenerateSP(s, 'SP1'); }}
                                                  disabled={s.kondisi !== KondisiStatus.AMAN}
                                                  className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                                  title="Generate SP1 (Perlu Pengawasan)"
                                              >
                                                  SP1
                                              </button>
                                              <button
                                                  onClick={(e) => { e.stopPropagation(); handleGenerateSP(s, 'SP2'); }}
                                                  disabled={s.kondisi !== KondisiStatus.PERHATIAN}
                                                  className="px-2 py-1 text-xs font-medium text-black bg-yellow-400 rounded-md shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                                  title="Generate SP2 (Perlakuan Khusus)"
                                              >
                                                  SP2
                                              </button>
                                              <button
                                                  onClick={(e) => { e.stopPropagation(); handleGenerateSP(s, 'SP3'); }}
                                                  disabled={s.kondisi !== KondisiStatus.BERMASALAH}
                                                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                                  title="Generate SP3 (Kondisi Kritis)"
                                              >
                                                  SP3
                                              </button>
                                          </div>
                                      </td>
                                    )}
                                    {!isGuru && (
                                      <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                          <button
                                              onClick={(e) => { e.stopPropagation(); handleExportSiswaReport(s); }}
                                              className="p-1 text-green-600 rounded-full hover:bg-green-100 dark:text-green-400 dark:hover:bg-gray-700"
                                              title={`Export Laporan ${s.user.nama}`}
                                          >
                                              <DownloadIcon className="w-5 h-5" />
                                          </button>
                                      </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={!isGuru ? 9 : 7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No students found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
                        <div className="hidden sm:block">
                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span> of{' '}
                                <span className="font-medium">{filteredData.length}</span> results
                            </p>
                        </div>
                        <div className="flex justify-between flex-1 sm:justify-end">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
                        </div>
                    </nav>
                )}
            </div>
            
            <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdatePhoto={handleUpdatePhoto} />

            <SiswaAddModal
                isOpen={isAddSiswaModalOpen}
                onClose={() => {
                  setIsAddSiswaModalOpen(false);
                  setError(null);
                }}
                onSave={handleAssignSiswa}
                kelasList={kelas}
                unassignedStudents={unassignedStudents}
                error={error}
            />
        </>
    );
};

export default SiswaPage;