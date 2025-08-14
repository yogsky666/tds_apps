import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Tingkat, Role, JenisSanksi, JenisPerbaikan } from '../types';
import { Avatar } from '../components/Avatar';
import { BackupIcon } from '../components/icons/BackupIcon';

// --- HELPER FUNCTIONS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getLastNDays = (n: number) => {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d);
    }
    return dates;
};

// --- SVG CHART COMPONENTS ---

interface PieChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 120 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: size, width: size }}>No data</div>;
    }

    const radius = size / 2;
    const center = radius;

    const activeDataPoints = data.filter(item => item.value > 0);

    // If only one category has data (100% case), render a simple circle
    if (activeDataPoints.length === 1) {
        const item = activeDataPoints[0];
        return (
            <div className="flex items-center justify-center">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <defs>
                        <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodColor="black" floodOpacity="0.5" />
                        </filter>
                    </defs>
                    <circle cx={center} cy={center} r={radius} fill={item.color} />
                    <text
                        x={center}
                        y={center}
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ filter: 'url(#text-shadow)' }}
                    >
                        100%
                    </text>
                </svg>
            </div>
        );
    }
    
    // Original logic for multiple segments
    let startAngle = -Math.PI / 2;

    const segments = data.map(item => {
        const percentage = item.value / total;
        if (percentage === 0) return null;

        const sliceAngle = percentage * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        const x1 = center + radius * Math.cos(startAngle);
        const y1 = center + radius * Math.sin(startAngle);
        const x2 = center + radius * Math.cos(endAngle);
        const y2 = center + radius * Math.sin(endAngle);
        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
        
        const pathData = `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = radius * 0.6;
        const labelX = center + labelRadius * Math.cos(midAngle);
        const labelY = center + labelRadius * Math.sin(midAngle);
        
        startAngle = endAngle;

        return {
            path: pathData,
            color: item.color,
            label: percentage > 0.05 ? `${Math.round(percentage * 100)}%` : null,
            labelX,
            labelY
        };
    }).filter((segment): segment is NonNullable<typeof segment> => segment !== null);

    return (
        <div className="flex items-center justify-center">
             <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodColor="black" floodOpacity="0.5" />
                    </filter>
                </defs>
                {segments.map((segment, index) => (
                    <path key={`path-${index}`} d={segment.path} fill={segment.color} />
                ))}
                 {segments.map((segment, index) => segment.label && (
                    <text
                        key={`label-${index}`}
                        x={segment.labelX}
                        y={segment.labelY}
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ filter: 'url(#text-shadow)' }}
                    >
                        {segment.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

interface LineChartProps {
    data: { labels: string[], datasets: { label: string, data: number[], color: string, gradient: string }[] };
    height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, height = 250 }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: { label: string, value: number, color: string }[] } | null>(null);
    const svgRef = React.useRef<SVGSVGElement>(null);

    const padding = { top: 20, right: 20, bottom: 30, left: 30 };
    const chartWidth = 500 - padding.left - padding.right; // Fixed width for consistent calculation
    const chartHeight = height - padding.top - padding.bottom;

    const allDataPoints = data.datasets.flatMap(ds => ds.data);
    const maxY = Math.ceil(Math.max(...allDataPoints, 1) / 5) * 5; // Round up to nearest 5
    
    const yAxisLabels = Array.from({ length: 6 }, (_, i) => Math.round(i * (maxY / 5)));

    const getCoords = (value: number, index: number) => {
        const x = (index / (data.labels.length - 1)) * chartWidth + padding.left;
        const y = chartHeight - (value / maxY) * chartHeight + padding.top;
        return { x, y };
    };
    
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = e.clientX - rect.left;
        const index = Math.round(((svgX - padding.left) / chartWidth) * (data.labels.length - 1));

        if (index >= 0 && index < data.labels.length) {
            const { x } = getCoords(0, index);
            const tooltipData = data.datasets.map(ds => ({
                label: ds.label,
                value: ds.data[index],
                color: ds.color
            }));
            const yPos = tooltipData.reduce((acc, curr, idx) => {
                const {y} = getCoords(curr.value, index);
                return Math.min(acc, y);
            }, height);
            setTooltip({ x, y: yPos, data: tooltipData });
        }
    };

    const handleMouseLeave = () => setTooltip(null);
    
    return (
        <div className="relative">
            <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 500 ${height}`} className="w-full" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <defs>
                    {data.datasets.map((ds, i) => (
                         <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ds.gradient} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={ds.gradient} stopOpacity={0}/>
                        </linearGradient>
                    ))}
                </defs>
                
                {/* Grid lines & Y-axis labels */}
                {yAxisLabels.map(label => {
                    const {y} = getCoords(label, 0);
                    return (
                        <g key={label}>
                            <line x1={padding.left} y1={y} x2={500-padding.right} y2={y} className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="0.5" />
                            <text x={padding.left - 8} y={y} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">{label}</text>
                        </g>
                    )
                })}
                 {/* X-axis labels */}
                {data.labels.map((label, index) => {
                    const { x } = getCoords(0, index);
                    return <text key={label} x={x} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">{label}</text>
                })}

                {/* Lines, Areas, and Points */}
                {data.datasets.map((dataset, i) => {
                    const points = dataset.data.map((value, index) => getCoords(value, index));
                    const pathD = "M" + points.map(p => `${p.x},${p.y}`).join(" L ");
                    const areaPathD = pathD + ` L ${points[points.length - 1].x},${chartHeight + padding.top} L ${points[0].x},${chartHeight + padding.top} Z`;

                    return (
                        <g key={i}>
                            <path d={areaPathD} fill={`url(#gradient-${i})`} />
                            <path d={pathD} fill="none" stroke={dataset.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p, j) => <circle key={j} cx={p.x} cy={p.y} r="3" fill={dataset.color} />)}
                            {/* Today's dot */}
                             <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="5" fill={dataset.color} strokeWidth="2" className="stroke-white dark:stroke-gray-800"/>
                        </g>
                    )
                })}

                {/* Tooltip */}
                {tooltip && (
                    <g>
                        <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={height - padding.bottom} className="stroke-current text-gray-400 dark:text-gray-500" strokeDasharray="4 4" />
                        {tooltip.data.map((d, i) => {
                            const { y } = getCoords(d.value, data.labels.indexOf(data.labels[Math.round(((tooltip.x - padding.left) / chartWidth) * (data.labels.length - 1))]));
                            return <circle key={i} cx={tooltip.x} cy={y} r="4" fill={d.color} stroke="white" strokeWidth={2}/>
                        })}
                    </g>
                )}
            </svg>

            {tooltip && (
                <div
                    className="absolute p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg pointer-events-none dark:bg-gray-900"
                    style={{
                        left: `${(tooltip.x / 500) * 100}%`,
                        top: `${tooltip.y - 60}px`,
                        transform: 'translateX(-50%)',
                        minWidth: '100px'
                    }}
                >
                    <p className="font-bold text-center mb-1">{data.labels[Math.round(((tooltip.x - padding.left) / chartWidth) * (data.labels.length - 1))]}</p>
                    {tooltip.data.map((d, i) => (
                         <div key={i} className="flex justify-between items-center">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full mr-1.5" style={{backgroundColor: d.color}}></span>{d.label}:</span>
                            <span className="font-bold ml-2">{d.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
    height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 250 }) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollbarRef = React.useRef<HTMLDivElement>(null);
    const [showScrollbar, setShowScrollbar] = useState(false);

    const padding = 40;
    const barWidth = 40;
    const barSpacing = 20;
    const dynamicWidth = data.length * (barWidth + barSpacing) + padding * 2 - barSpacing;
    
    const chartHeight = height - padding * 2;
    const maxY = Math.max(...data.map(d => d.value), 1);

    React.useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const scrollbar = scrollbarRef.current;

        const checkScrollbarVisibility = () => {
            if (scrollContainer) {
                const isOverflowing = scrollContainer.scrollWidth > scrollContainer.clientWidth;
                setShowScrollbar(isOverflowing);
            }
        };

        checkScrollbarVisibility();
        window.addEventListener('resize', checkScrollbarVisibility);

        const handleScroll = () => {
            if (scrollContainer && scrollbar && showScrollbar) {
                if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                    const scrollPercentage = scrollContainer.scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth);
                    const thumb = scrollbar.firstChild as HTMLDivElement;
                    if (thumb) {
                        thumb.style.left = `${scrollPercentage * (scrollbar.clientWidth - thumb.clientWidth)}px`;
                    }
                }
            }
        };

        scrollContainer?.addEventListener('scroll', handleScroll);
        
        return () => {
            scrollContainer?.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', checkScrollbarVisibility);
        };
    }, [data, showScrollbar]);

    return (
        <div className="relative" ref={chartRef}>
            <div className="overflow-x-auto pb-4 -ml-4 -mr-4 px-4" ref={scrollContainerRef}>
                <svg width={dynamicWidth} height={height} viewBox={`0 0 ${dynamicWidth} ${height}`}>
                    {data.map((d, i) => {
                        const barHeight = d.value > 0 ? (d.value / maxY) * chartHeight : 0;
                        const x = padding + i * (barWidth + barSpacing);
                        const y = padding + chartHeight - barHeight;
                        return (
                            <g key={d.label}>
                                <rect x={x} y={y} width={barWidth} height={barHeight} fill={d.color} rx="4" ry="4" className="transition-all duration-300"/>
                                <text x={x + barWidth / 2} y={height - padding + 15} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400 select-none">{d.label}</text>
                                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="text-sm font-bold fill-current text-gray-800 dark:text-gray-200 select-none">{d.value}</text>
                            </g>
                        )
                    })}
                    <line x1={padding - barSpacing/2} y1={height - padding} x2={dynamicWidth - padding + barSpacing/2} y2={height - padding} className="stroke-current text-gray-300 dark:text-gray-600" />
                </svg>
            </div>
            {showScrollbar && (
                <div ref={scrollbarRef} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                    <div className="h-2 bg-gray-400 dark:bg-gray-500 rounded-full relative" style={{width: `${(chartRef.current?.clientWidth || dynamicWidth) / dynamicWidth * 100}%`}}></div>
                </div>
            )}
        </div>
    )
}


// --- MAIN DASHBOARD PAGE ---

const DashboardPage: React.FC = () => {
  const { users, siswa, pelanggaran, bimbingan, sanksi, introspeksi, kelas } = useAuth();
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [barChartTingkatFilter, setBarChartTingkatFilter] = useState<Tingkat | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const handleBackup = () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    // Simulate backup process
    setTimeout(() => {
        setIsBackingUp(false);
        setBackupMessage("Pencadangan data berhasil diproses.");
        // Hide message after a few seconds
        setTimeout(() => {
            setBackupMessage(null);
        }, 3500);
    }, 1500);
  };

  const memoizedData = useMemo(() => {
    // Maps for efficient lookups
    const userMap = new Map(users.map(u => [u.username, u]));
    const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
    const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));
    const siswaKelasMap = new Map(siswa.map(s => [s.nipd, s.id_kelas]));
    const kelasMap = new Map(kelas.map(k => [k.id, k]));

    // 1. Jumlah Siswa per Tingkat
    const siswaPerTingkat = { [Tingkat.X]: 0, [Tingkat.XI]: 0, [Tingkat.XII]: 0 };
    siswa.forEach(s => {
        const k = s.id_kelas ? kelasMap.get(s.id_kelas) : null;
        if (k && k.tingkat in siswaPerTingkat) {
            siswaPerTingkat[k.tingkat]++;
        }
    });

    // 2. Total Pelanggaran (All-Time)
    const totalPelanggaranAllTime = pelanggaran.length;

    // 3 & 4. Data Harian
    const today = getTodayDateString();
    const pelanggaranHariIni = pelanggaran.filter(p => p.tanggal === today);
    const bimbinganHariIni = bimbingan.filter(b => b.tanggal === today);
    
    // Pie chart data
    const piePelanggaran = { [JenisSanksi.RINGAN]: 0, [JenisSanksi.SEDANG]: 0, [JenisSanksi.BERAT]: 0 };
    pelanggaranHariIni.forEach(p => {
        const s = sanksiMap.get(p.id_sanksi);
        if (s) piePelanggaran[s.jenis_sanksi]++;
    });
    
    const pieBimbingan = { [JenisPerbaikan.MUDAH]: 0, [JenisPerbaikan.CUKUP]: 0, [JenisPerbaikan.SULIT]: 0 };
    bimbinganHariIni.forEach(b => {
        const i = introspeksiMap.get(b.id_perbaikan);
        if (i) pieBimbingan[i.jenis_perbaikan]++;
    });
    
    // 5. Grafik Real-time (last 7 days)
    const last7Days = getLastNDays(7);
    const lineChartData = {
        labels: last7Days.map(d => d.toLocaleDateString('id-ID', { weekday: 'short' })),
        datasets: [
            { label: 'Pelanggaran', data: last7Days.map(date => pelanggaran.filter(p => p.tanggal === date.toISOString().split('T')[0]).length), color: '#ef4444', gradient: '#ef4444' },
            { label: 'Perbaikan', data: last7Days.map(date => bimbingan.filter(b => b.tanggal === date.toISOString().split('T')[0]).length), color: '#22c55e', gradient: '#22c55e' }
        ]
    };
    
    // Filtered data by month
    const pelanggaranBulanIni = pelanggaran.filter(p => p.tanggal.startsWith(monthFilter));
    const bimbinganBulanIni = bimbingan.filter(b => b.tanggal.startsWith(monthFilter));

    // 6. Grafik Batang per Kelas (Bulanan)
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
            return {
                label: k.kelas,
                value: pelanggaranPerKelas.get(k.id) || 0,
                tingkat: k.tingkat
            };
        })
        .filter((item): item is { label: string, value: number, tingkat: Tingkat } => item !== null)
        .sort((a, b) => {
            const tingkatOrder = { [Tingkat.X]: 1, [Tingkat.XI]: 2, [Tingkat.XII]: 3 };
            if (tingkatOrder[a.tingkat] !== tingkatOrder[b.tingkat]) {
                return tingkatOrder[a.tingkat] - tingkatOrder[b.tingkat];
            }
            return a.label.localeCompare(b.label);
        });

    // 7. 5 Siswa Teratas (Bulanan)
    const monthlyPoints = new Map<string, { pelanggaran: number; perbaikan: number }>();
    pelanggaranBulanIni.forEach(p => {
        const s = sanksiMap.get(p.id_sanksi);
        if(s) {
            const current = monthlyPoints.get(p.nipd) || { pelanggaran: 0, perbaikan: 0 };
            current.pelanggaran += s.point_pelanggar;
            monthlyPoints.set(p.nipd, current);
        }
    });
    bimbinganBulanIni.forEach(b => {
        const i = introspeksiMap.get(b.id_perbaikan);
        if(i) {
            const current = monthlyPoints.get(b.nipd) || { pelanggaran: 0, perbaikan: 0 };
            current.perbaikan += i.point_perbaikan;
            monthlyPoints.set(b.nipd, current);
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
        
    // New logic: Most Common Sanction & Bimbingan (Monthly)
    let mostCommonSanksi = null;
    if (pelanggaranBulanIni.length > 0) {
        const sanksiCounts = new Map<number, number>();
        pelanggaranBulanIni.forEach(p => {
            sanksiCounts.set(p.id_sanksi, (sanksiCounts.get(p.id_sanksi) || 0) + 1);
        });

        const [mostCommonId, count] = [...sanksiCounts.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
        
        const sanksiInfo = sanksiMap.get(mostCommonId);
        if (sanksiInfo) {
            const uniqueSiswa = new Set(pelanggaranBulanIni.filter(p => p.id_sanksi === mostCommonId).map(p => p.nipd));
            mostCommonSanksi = {
                ...sanksiInfo,
                count,
                siswaCount: uniqueSiswa.size
            };
        }
    }

    let mostCommonBimbingan = null;
    if (bimbinganBulanIni.length > 0) {
        const bimbinganCounts = new Map<number, number>();
        bimbinganBulanIni.forEach(b => {
            bimbinganCounts.set(b.id_perbaikan, (bimbinganCounts.get(b.id_perbaikan) || 0) + 1);
        });

        const [mostCommonId, count] = [...bimbinganCounts.entries()].reduce((a, b) => b[1] > a[1] ? b : a);

        const bimbinganInfo = introspeksiMap.get(mostCommonId);
        if (bimbinganInfo) {
            const uniqueSiswa = new Set(bimbinganBulanIni.filter(b => b.id_perbaikan === mostCommonId).map(b => b.nipd));
            mostCommonBimbingan = {
                ...bimbinganInfo,
                count,
                siswaCount: uniqueSiswa.size
            };
        }
    }

    return { 
        siswaPerTingkat, 
        totalPelanggaranAllTime, 
        pelanggaranHariIniCount: pelanggaranHariIni.length,
        bimbinganHariIniCount: bimbinganHariIni.length,
        piePelanggaran, 
        pieBimbingan, 
        lineChartData, 
        barChartDataPerKelas, 
        topOffenders, 
        mostCommonSanksi, 
        mostCommonBimbingan 
    };

  }, [users, siswa, pelanggaran, bimbingan, sanksi, introspeksi, kelas, monthFilter]);

  const piePelanggaranData = [
    { label: 'Ringan', value: memoizedData.piePelanggaran[JenisSanksi.RINGAN], color: '#4ade80' },
    { label: 'Sedang', value: memoizedData.piePelanggaran[JenisSanksi.SEDANG], color: '#facc15' },
    { label: 'Berat', value: memoizedData.piePelanggaran[JenisSanksi.BERAT], color: '#f87171' },
  ];

  const pieBimbinganData = [
    { label: 'Mudah', value: memoizedData.pieBimbingan[JenisPerbaikan.MUDAH], color: '#60a5fa' },
    { label: 'Cukup', value: memoizedData.pieBimbingan[JenisPerbaikan.CUKUP], color: '#818cf8' },
    { label: 'Sulit', value: memoizedData.pieBimbingan[JenisPerbaikan.SULIT], color: '#c084fc' },
  ];
  
    const tingkatColors: Record<Tingkat, string> = {
        [Tingkat.X]: '#3b82f6', // blue-500
        [Tingkat.XI]: '#8b5cf6', // violet-500
        [Tingkat.XII]: '#ec4899', // pink-500
    };
    const highColor = '#ef4444'; // red-500
    const lowColor = '#22c55e'; // green-500

    const barChartFormattedData = useMemo(() => {
        const { barChartDataPerKelas } = memoizedData;
        const dataToProcess = barChartTingkatFilter
            ? barChartDataPerKelas.filter(d => d.tingkat === barChartTingkatFilter)
            : barChartDataPerKelas;

        if (dataToProcess.length === 0) return [];

        const values = dataToProcess.map(d => d.value).filter(v => v > 0);
        const maxValue = Math.max(...values, 0);
        const minValue = Math.min(...values, Infinity);

        return dataToProcess.map(item => {
            let color = tingkatColors[item.tingkat];
            if (dataToProcess.length > 1 && maxValue > minValue) {
                if (item.value === maxValue) {
                    color = highColor;
                } else if (item.value === minValue) {
                    color = lowColor;
                }
            }
            return { ...item, color };
        });
    }, [memoizedData.barChartDataPerKelas, barChartTingkatFilter]);
    
    const handleTingkatFilterClick = (tingkat: Tingkat) => {
        setBarChartTingkatFilter(prev => (prev === tingkat ? null : tingkat));
    };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors duration-150 bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:focus:ring-offset-gray-900 disabled:cursor-wait"
                    aria-live="polite"
                >
                    <BackupIcon className={`w-5 h-5 mr-2 -ml-1 ${isBackingUp ? 'animate-pulse' : ''}`} />
                    {isBackingUp ? 'Mencadangkan...' : 'Cadangkan Data'}
                </button>
                <input
                    id="month-filter"
                    type="month"
                    value={monthFilter}
                    onChange={e => setMonthFilter(e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md shadow-sm md:w-auto focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
            </div>
        </div>

        {backupMessage && (
            <div
                role="alert"
                className="fixed top-20 right-6 z-50 p-4 rounded-md shadow-lg bg-green-600 text-white animate-toast flex items-center space-x-3"
            >
                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{backupMessage}</span>
            </div>
        )}

        {/* --- METRIC CARDS --- */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {Object.entries(memoizedData.siswaPerTingkat).map(([tingkat, jumlah]) => (
                <div key={tingkat} className="p-5 overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Siswa Tingkat {tingkat}</p>
                    <p className="mt-1 text-3xl font-semibold text-center text-gray-900 dark:text-white">{jumlah}</p>
                </div>
            ))}
            <div className="p-5 overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Total Pelanggaran</p>
                <p className="mt-1 text-3xl font-semibold text-center text-gray-900 dark:text-white">{memoizedData.totalPelanggaranAllTime}</p>
            </div>
            <div className="p-5 overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Pelanggaran Hari Ini</p>
                <p className="mt-1 text-3xl font-semibold text-center text-red-600 dark:text-red-400">{memoizedData.pelanggaranHariIniCount}</p>
            </div>
            <div className="p-5 overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Perbaikan Hari Ini</p>
                <p className="mt-1 text-3xl font-semibold text-center text-green-600 dark:text-green-400">{memoizedData.bimbinganHariIniCount}</p>
            </div>
        </div>
        
        {/* --- MONTHLY INSIGHTS --- */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Most Common Sanction Card */}
            <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Sanksi Paling Umum (Bulanan)</h3>
                {memoizedData.mostCommonSanksi ? (
                    <div className="mt-4">
                        <p className="p-3 text-sm text-gray-800 bg-gray-100 rounded-md dark:text-gray-200 dark:bg-gray-700">
                            "{memoizedData.mostCommonSanksi.desk_kesalahan}"
                        </p>
                        <div className="flex justify-around mt-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-red-500">{memoizedData.mostCommonSanksi.count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Kejadian</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{memoizedData.mostCommonSanksi.siswaCount}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Siswa</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data sanksi untuk bulan ini.</p>
                    </div>
                )}
            </div>

            {/* Most Common Improvement Card */}
            <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Perbaikan Paling Umum (Bulanan)</h3>
                {memoizedData.mostCommonBimbingan ? (
                    <div className="mt-4">
                        <p className="p-3 text-sm text-gray-800 bg-gray-100 rounded-md dark:text-gray-200 dark:bg-gray-700">
                            "{memoizedData.mostCommonBimbingan.desk_perbaikan}"
                        </p>
                        <div className="flex justify-around mt-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-green-500">{memoizedData.mostCommonBimbingan.count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Kejadian</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{memoizedData.mostCommonBimbingan.siswaCount}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Jumlah Siswa</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data perbaikan untuk bulan ini.</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- DAILY CHARTS --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="p-5 bg-white rounded-lg shadow-md lg:col-span-2 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Tren 7 Hari Terakhir</h3>
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center"><span className="w-3 h-3 mr-2 rounded-full bg-red-500"></span>Pelanggaran</div>
                        <div className="flex items-center"><span className="w-3 h-3 mr-2 rounded-full bg-green-500"></span>Perbaikan</div>
                    </div>
                </div>
                <LineChart data={memoizedData.lineChartData} />
            </div>

            <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Pelanggaran Hari Ini</h3>
                <PieChart data={piePelanggaranData} />
                <div className="mt-3 space-y-2">
                    {piePelanggaranData.map(d => (
                        <div key={d.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center"><span className="w-3 h-3 mr-2 rounded-full" style={{backgroundColor: d.color}}></span>{d.label}</div>
                            <span className="font-semibold">{d.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-5 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Perbaikan Hari Ini</h3>
                <PieChart data={pieBimbinganData} />
                <div className="mt-3 space-y-2">
                    {pieBimbinganData.map(d => (
                        <div key={d.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center"><span className="w-3 h-3 mr-2 rounded-full" style={{backgroundColor: d.color}}></span>{d.label}</div>
                            <span className="font-semibold">{d.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* --- MONTHLY CHARTS --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="p-5 bg-white rounded-lg shadow-md lg:col-span-1 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">5 Pelanggar Teratas (Bulanan)</h3>
                <div className="mt-4 flow-root">
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        {memoizedData.topOffenders.length > 0 ? memoizedData.topOffenders.map(item => (
                            <li key={item.siswa.username} className="py-3">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <Avatar user={item.siswa} className="w-10 h-10 rounded-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{item.siswa.nama}</p>
                                        <p className="text-sm text-gray-500 truncate dark:text-gray-400">{item.kelas?.kelas || 'Tidak ada kelas'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{item.total}</p>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            <span className="text-red-500">-{item.pelanggaran}</span> / <span className="text-green-500">+{item.perbaikan}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )) : (
                             <li className="py-10 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data pelanggaran untuk bulan ini.</p>
                             </li>
                        )}
                    </ul>
                </div>
            </div>
            <div className="p-5 bg-white rounded-lg shadow-md lg:col-span-1 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">Pelanggaran per Kelas (Bulanan)</h3>
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
                    <div className="flex items-center justify-center h-full min-h-[250px]">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada data pelanggaran untuk bulan ini.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default DashboardPage;