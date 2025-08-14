
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Tingkat, Role, LogAction, LogEntity } from '../types';
import { Avatar } from '../components/Avatar';
import { DownloadIcon } from '../components/icons/DownloadIcon';

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
    height?: number;
}

const tingkatColors: Record<Tingkat, string> = {
    [Tingkat.X]: '#3b82f6', // blue-500
    [Tingkat.XI]: '#8b5cf6', // violet-500
    [Tingkat.XII]: '#ec4899', // pink-500
};

const BarChart: React.FC<BarChartProps> = ({ data, height = 250 }) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showScrollbar, setShowScrollbar] = useState(false);

    const padding = 40;
    const barWidth = 40;
    const barSpacing = 20;
    const dynamicWidth = data.length * (barWidth + barSpacing) + padding * 2 - barSpacing;
    
    const chartHeight = height - padding * 2;
    const maxY = Math.max(...data.map(d => d.value), 1);

    React.useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const checkScrollbarVisibility = () => {
            if (scrollContainer) {
                const isOverflowing = scrollContainer.scrollWidth > scrollContainer.clientWidth;
                setShowScrollbar(isOverflowing);
            }
        };
        checkScrollbarVisibility();
        window.addEventListener('resize', checkScrollbarVisibility);
        return () => window.removeEventListener('resize', checkScrollbarVisibility);
    }, [data]);
    
    return (
        <div className="relative" ref={chartRef}>
            <div className="overflow-x-auto pb-4" ref={scrollContainerRef}>
                <svg width={dynamicWidth} height={height} viewBox={`0 0 ${dynamicWidth} ${height}`}>
                    {data.map((d, i) => {
                        const barHeight = d.value > 0 ? (d.value / maxY) * chartHeight : 0;
                        const x = padding + i * (barWidth + barSpacing);
                        const y = padding + chartHeight - barHeight;
                        return (
                            <g key={d.label}>
                                <rect x={x} y={y} width={barWidth} height={barHeight} fill={d.color} rx="4" ry="4" />
                                <text x={x + barWidth / 2} y={height - padding + 15} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400 select-none">{d.label}</text>
                                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="text-sm font-bold fill-current text-gray-800 dark:text-gray-200 select-none">{d.value}</text>
                            </g>
                        )
                    })}
                    <line x1={padding - barSpacing/2} y1={height - padding} x2={dynamicWidth - padding + barSpacing/2} y2={height - padding} className="stroke-current text-gray-300 dark:text-gray-600" />
                </svg>
            </div>
            {showScrollbar && (
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                    <div className="h-2 bg-gray-400 dark:bg-gray-500 rounded-full relative" style={{width: `${(chartRef.current?.clientWidth || dynamicWidth) / dynamicWidth * 100}%`}}></div>
                </div>
            )}
        </div>
    )
}

const ExportPage: React.FC = () => {
    const { users, siswa, pelanggaran, bimbingan, sanksi, introspeksi, kelas, addLog } = useAuth();
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [barChartTingkatFilter, setBarChartTingkatFilter] = useState<Tingkat | null>(null);
    const [loading, setLoading] = useState({
        pelanggaran: false,
        bimbingan: false,
        ringkasan: false,
        tanpaKelas: false,
        topOffendersChart: false,
        pelanggaranKelasChart: false
    });

    const topOffendersRef = useRef<HTMLDivElement>(null);
    const pelanggaranKelasRef = useRef<HTMLDivElement>(null);

    const memoizedData = useMemo(() => {
        // ... (data processing logic copied from DashboardPage)
        const userMap = new Map(users.map(u => [u.username, u]));
        const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
        const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));
        const siswaKelasMap = new Map(siswa.map(s => [s.nipd, s.id_kelas]));
        const kelasMap = new Map(kelas.map(k => [k.id, k]));

        const pelanggaranBulanIni = pelanggaran.filter(p => p.tanggal.startsWith(monthFilter));
        const bimbinganBulanIni = bimbingan.filter(b => b.tanggal.startsWith(monthFilter));
        
        // Data for charts
        const monthlyPoints = new Map<string, { pelanggaran: number; perbaikan: number }>();
        pelanggaranBulanIni.forEach(p => {
            const s = sanksiMap.get(p.id_sanksi);
            if(s) {
                const current = monthlyPoints.get(p.nipd) || { pelanggaran: 0, perbaikan: 0 };
                current.pelanggaran += s.point_pelanggar;
                monthlyPoints.set(p.nipd, current);
            }
        });
        bimbinganBulanIni.forEach(p => { // Fix: variable name should be 'b'
            const i = introspeksiMap.get(p.id_perbaikan); // Fix: variable name should be 'b'
            if(i) {
                const current = monthlyPoints.get(p.nipd) || { pelanggaran: 0, perbaikan: 0 }; // Fix: variable name should be 'b'
                current.perbaikan += i.point_perbaikan;
                monthlyPoints.set(p.nipd, current); // Fix: variable name should be 'b'
            }
        });

        const topOffenders = Array.from(monthlyPoints.entries())
            .map(([nipd, points]) => ({
                siswa: userMap.get(nipd)!,
                kelas: kelasMap.get(siswaKelasMap.get(nipd)!) || null,
                ...points,
                total: Math.max(0, points.pelanggaran - points.perbaikan)
            }))
            .filter(item => item.siswa && item.siswa.role === Role.SISWA)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const pelanggaranPerKelas = new Map<number, number>();
        pelanggaranBulanIni.forEach(p => {
            const studentKelasId = siswaKelasMap.get(p.nipd);
            if (studentKelasId) {
                pelanggaranPerKelas.set(studentKelasId, (pelanggaranPerKelas.get(studentKelasId) || 0) + 1);
            }
        });

        const kelasYangAdaSiswa = new Set(siswa.map(s => s.id_kelas).filter((id): id is number => id !== null));
        const barChartDataPerKelas = Array.from(kelasYangAdaSiswa)
            .map(kelasId => {
                const k = kelasMap.get(kelasId);
                if (!k) return null;
                return { label: k.kelas, value: pelanggaranPerKelas.get(k.id) || 0, tingkat: k.tingkat };
            })
            .filter((item): item is { label: string, value: number, tingkat: Tingkat } => item !== null)
            .sort((a, b) => a.label.localeCompare(b.label));

        return { topOffenders, barChartDataPerKelas, pelanggaranBulanIni, bimbinganBulanIni };
    }, [users, siswa, pelanggaran, bimbingan, sanksi, introspeksi, kelas, monthFilter]);

    const barChartFormattedData = useMemo(() => {
        const dataToProcess = barChartTingkatFilter
            ? memoizedData.barChartDataPerKelas.filter(d => d.tingkat === barChartTingkatFilter)
            : memoizedData.barChartDataPerKelas;

        return dataToProcess.map(item => ({
            ...item,
            color: tingkatColors[item.tingkat]
        }));
    }, [memoizedData.barChartDataPerKelas, barChartTingkatFilter]);

    const handleTingkatFilterClick = (tingkat: Tingkat) => {
        setBarChartTingkatFilter(prev => (prev === tingkat ? null : tingkat));
    };

    const handleExport = useCallback(async (type: keyof typeof loading) => {
        setLoading(prev => ({...prev, [type]: true}));
        try {
            const userMap = new Map(users.map(u => [u.username, u]));
            const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
            const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));
            const siswaKelasMap = new Map(siswa.map(s => [s.nipd, s.id_kelas]));
            const kelasMap = new Map(kelas.map(k => [k.id, k]));

            let dataToExport: any[] = [];
            let fileName = '';
            let sheetName = '';

            switch (type) {
                case 'pelanggaran':
                    dataToExport = memoizedData.pelanggaranBulanIni.map((p, i) => {
                        const student = userMap.get(p.nipd);
                        const sanksiInfo = sanksiMap.get(p.id_sanksi);
                        const idKelas = siswaKelasMap.get(p.nipd);
                        const kelasInfo = idKelas ? kelasMap.get(idKelas) : null;
                        return {
                            'No.': i + 1,
                            'Tanggal': p.tanggal,
                            'NIPD': p.nipd,
                            'Nama Siswa': student?.nama || 'N/A',
                            'Kelas': kelasInfo?.kelas || '-',
                            'Pelanggaran': sanksiInfo?.desk_kesalahan || 'N/A',
                            'Jenis': sanksiInfo?.jenis_sanksi || 'N/A',
                            'Poin': sanksiInfo?.point_pelanggar || 0,
                        }
                    });
                    fileName = `Laporan_Pelanggaran_${monthFilter}.xlsx`;
                    sheetName = 'Pelanggaran';
                    break;
                case 'bimbingan':
                    dataToExport = memoizedData.bimbinganBulanIni.map((b, i) => {
                        const student = userMap.get(b.nipd);
                        const perbaikanInfo = introspeksiMap.get(b.id_perbaikan);
                        const idKelas = siswaKelasMap.get(b.nipd);
                        const kelasInfo = idKelas ? kelasMap.get(idKelas) : null;
                         return {
                            'No.': i + 1,
                            'Tanggal': b.tanggal,
                            'NIPD': b.nipd,
                            'Nama Siswa': student?.nama || 'N/A',
                            'Kelas': kelasInfo?.kelas || '-',
                            'Perbaikan': perbaikanInfo?.desk_perbaikan || 'N/A',
                            'Jenis': perbaikanInfo?.jenis_perbaikan || 'N/A',
                            'Poin': perbaikanInfo?.point_perbaikan || 0,
                        }
                    });
                    fileName = `Laporan_Bimbingan_${monthFilter}.xlsx`;
                    sheetName = 'Bimbingan';
                    break;
                case 'ringkasan':
                     const pointSummary = new Map<string, { pelanggaran: number; perbaikan: number }>();
                     memoizedData.pelanggaranBulanIni.forEach(p => {
                         const s = sanksiMap.get(p.id_sanksi);
                         if (s) {
                             const current = pointSummary.get(p.nipd) || { pelanggaran: 0, perbaikan: 0 };
                             current.pelanggaran += s.point_pelanggar;
                             pointSummary.set(p.nipd, current);
                         }
                     });
                     memoizedData.bimbinganBulanIni.forEach(b => {
                         const i = introspeksiMap.get(b.id_perbaikan);
                         if (i) {
                             const current = pointSummary.get(b.nipd) || { pelanggaran: 0, perbaikan: 0 };
                             current.perbaikan += i.point_perbaikan;
                             pointSummary.set(b.nipd, current);
                         }
                     });
                     dataToExport = Array.from(pointSummary.entries()).map(([nipd, points], i) => {
                         const student = userMap.get(nipd);
                         const idKelas = siswaKelasMap.get(nipd);
                         const kelasInfo = idKelas ? kelasMap.get(idKelas) : null;
                         return {
                             'No.': i + 1,
                             'NIPD': nipd,
                             'Nama Siswa': student?.nama || 'N/A',
                             'Kelas': kelasInfo?.kelas || '-',
                             'Total Poin Pelanggaran': points.pelanggaran,
                             'Total Poin Perbaikan': points.perbaikan,
                             'Poin Akhir': Math.max(0, points.pelanggaran - points.perbaikan),
                         }
                     });
                    fileName = `Ringkasan_Poin_Siswa_${monthFilter}.xlsx`;
                    sheetName = 'Ringkasan Poin';
                    break;
                case 'tanpaKelas':
                    const assignedSiswaNipds = new Set(siswa.filter(s => s.id_kelas !== null).map(s => s.nipd));
                    dataToExport = users.filter(u => u.role === Role.SISWA && !assignedSiswaNipds.has(u.username)).map((u, i) => ({
                        'No.': i + 1,
                        'NIPD': u.username,
                        'Nama Siswa': u.nama,
                        'Jenis Kelamin': u.jenis_kelamin,
                    }));
                    fileName = `Daftar_Siswa_Tanpa_Kelas.xlsx`;
                    sheetName = 'Siswa Tanpa Kelas';
                    break;
            }

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            if (dataToExport.length > 0) {
                 worksheet['!cols'] = Object.keys(dataToExport[0]).map(key => ({ wch: Math.max(key.length, ...dataToExport.map(row => row[key]?.toString().length ?? 0)) + 2 }));
            }
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            XLSX.writeFile(workbook, fileName);
            addLog(LogAction.EXPORT, LogEntity.LAPORAN, `Mengekspor laporan Excel: ${type}`);

        } catch (err) {
            console.error("Export failed:", err);
        } finally {
            setLoading(prev => ({...prev, [type]: false}));
        }
    }, [monthFilter, memoizedData, users, siswa, kelas, sanksi, introspeksi, addLog]);
    
    const handleDownloadChart = useCallback(async (ref: React.RefObject<HTMLDivElement>, type: keyof typeof loading, fileName: string, format: 'png' | 'pdf' = 'png') => {
        if (!ref.current) return;
        setLoading(prev => ({ ...prev, [type]: true }));
        try {
            const dataUrl = await toPng(ref.current, {
                cacheBust: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                pixelRatio: 2
            });

            if (format === 'pdf') {
                const doc = new jsPDF('landscape', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                
                const imgProps = doc.getImageProperties(dataUrl);
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;
                const ratio = imgWidth / imgHeight;

                let pdfWidth = pageWidth - 20; // with margin
                let pdfHeight = pdfWidth / ratio;
                
                if (pdfHeight > pageHeight - 20) {
                    pdfHeight = pageHeight - 20;
                    pdfWidth = pdfHeight * ratio;
                }

                const x = (pageWidth - pdfWidth) / 2;
                const y = (pageHeight - pdfHeight) / 2;

                doc.addImage(dataUrl, 'PNG', x, y, pdfWidth, pdfHeight);
                doc.save(`${fileName}_${monthFilter}.pdf`);
            } else {
                 const link = document.createElement('a');
                link.download = `${fileName}_${monthFilter}.png`;
                link.href = dataUrl;
                link.click();
            }
            addLog(LogAction.EXPORT, LogEntity.LAPORAN, `Mengekspor grafik: ${fileName}`);

        } catch (err) {
            console.error(`Failed to download ${format}`, err);
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [monthFilter, addLog]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Export Laporan</h1>
                <div>
                    <label htmlFor="month-filter" className="sr-only">Filter Bulan</label>
                    <input
                        id="month-filter"
                        type="month"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md shadow-sm md:w-auto focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    />
                </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Export Data (.xlsx)</h2>
                <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Excel Export Buttons */}
                    <ExportCard title="Laporan Pelanggaran" description="Unduh rincian semua pelanggaran pada bulan yang dipilih." onExport={() => handleExport('pelanggaran')} loading={loading.pelanggaran} />
                    <ExportCard title="Laporan Bimbingan" description="Unduh rincian semua bimbingan dan perbaikan pada bulan yang dipilih." onExport={() => handleExport('bimbingan')} loading={loading.bimbingan} />
                    <ExportCard title="Ringkasan Poin Siswa" description="Unduh rekapitulasi poin akhir semua siswa pada bulan yang dipilih." onExport={() => handleExport('ringkasan')} loading={loading.ringkasan} />
                    <ExportCard title="Siswa Tanpa Kelas" description="Unduh daftar semua siswa yang belum memiliki kelas." onExport={() => handleExport('tanpaKelas')} loading={loading.tanpaKelas} />
                </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 dark:text-white dark:border-gray-700 pb-4">Export Grafik</h2>
                <div className="grid grid-cols-1 gap-6 mt-4 lg:grid-cols-2">
                    {/* Top Offenders Chart */}
                    <div>
                        <div ref={topOffendersRef} className="p-4 bg-white rounded-lg dark:bg-gray-800">
                             <h3 className="mb-4 font-semibold text-center text-gray-900 dark:text-white">5 Pelanggar Teratas ({monthFilter})</h3>
                             <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {memoizedData.topOffenders.length > 0 ? memoizedData.topOffenders.map(item => (
                                    <li key={item.siswa.username} className="py-3">
                                        <div className="flex items-center space-x-4">
                                            <Avatar user={item.siswa} className="w-10 h-10 rounded-full" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{item.siswa.nama}</p>
                                                <p className="text-sm text-gray-500 truncate dark:text-gray-400">{item.kelas?.kelas || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{item.total}</p>
                                            </div>
                                        </div>
                                    </li>
                                )) : <li className="py-10 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data.</p></li>}
                            </ul>
                        </div>
                        <button onClick={() => handleDownloadChart(topOffendersRef, 'topOffendersChart', '5_Pelanggar_Teratas', 'png')} disabled={loading.topOffendersChart} className="inline-flex items-center justify-center w-full px-4 py-2 mt-4 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400">
                            <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                            {loading.topOffendersChart ? 'Mengunduh...' : 'Download PNG'}
                        </button>
                    </div>
                    {/* Pelanggaran per Kelas Chart */}
                    <div>
                        <div ref={pelanggaranKelasRef} className="p-4 bg-white rounded-lg dark:bg-gray-800">
                            <h3 className="mb-4 font-semibold text-center text-gray-900 dark:text-white">Pelanggaran per Kelas ({monthFilter})</h3>
                            {memoizedData.barChartDataPerKelas.length > 0 ? (
                                <>
                                    <BarChart data={barChartFormattedData} />
                                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
                                        {[Tingkat.X, Tingkat.XI, Tingkat.XII].map(tingkat => (
                                            <button
                                                key={tingkat}
                                                onClick={() => handleTingkatFilterClick(tingkat)}
                                                className={`flex items-center px-2 py-1 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 ${barChartTingkatFilter && barChartTingkatFilter !== tingkat ? 'opacity-40 hover:opacity-100' : ''} ${barChartTingkatFilter === tingkat ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                            >
                                                <span className="w-3 h-3 mr-1.5 rounded-full" style={{ backgroundColor: tingkatColors[tingkat] }}></span>
                                                Tingkat {tingkat}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-[250px]"><p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data.</p></div>
                            )}
                        </div>
                         <button onClick={() => handleDownloadChart(pelanggaranKelasRef, 'pelanggaranKelasChart', 'Pelanggaran_per_Kelas', 'pdf')} disabled={loading.pelanggaranKelasChart} className="inline-flex items-center justify-center w-full px-4 py-2 mt-4 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400">
                            <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                            {loading.pelanggaranKelasChart ? 'Mengunduh...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExportCard: React.FC<{title: string, description: string, onExport: () => void, loading: boolean}> = ({ title, description, onExport, loading }) => (
    <div className="flex flex-col p-4 border border-gray-200 rounded-lg dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="flex-grow mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <button onClick={onExport} disabled={loading} className="inline-flex items-center justify-center w-full px-4 py-2 mt-4 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400">
            <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
            {loading ? 'Mengekspor...' : 'Export'}
        </button>
    </div>
);

export default ExportPage;
