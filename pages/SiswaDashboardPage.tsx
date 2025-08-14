import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sanksi, Introspeksi, Pelanggaran, Bimbingan } from '../types';
import { PelanggaranIcon } from '../components/icons/PelanggaranIcon';
import { BimbinganIcon } from '../components/icons/BimbinganIcon';

interface ViolationWithData {
  pelanggaran: Pelanggaran;
  sanksi: Sanksi;
}
interface ImprovementWithData {
  bimbingan: Bimbingan;
  perbaikan: Introspeksi;
}

const SiswaDashboardPage: React.FC = () => {
  const { user, pelanggaran, bimbingan, sanksi, introspeksi } = useAuth();
  const [activeView, setActiveView] = useState<'pelanggaran' | 'perbaikan'>('pelanggaran');

  const studentData = useMemo(() => {
    if (!user) {
        return { violations: [], improvements: [], totalViolationPoints: 0, totalImprovementPoints: 0 };
    }

    const sanksiMap = new Map(sanksi.map(s => [s.id, s]));
    const introspeksiMap = new Map(introspeksi.map(i => [i.id, i]));

    const violations = pelanggaran
      .filter(p => p.nipd === user.username)
      .map(p => ({ pelanggaran: p, sanksi: sanksiMap.get(p.id_sanksi) }))
      .filter((p): p is ViolationWithData => !!p.sanksi)
      .sort((a, b) => new Date(b.pelanggaran.tanggal).getTime() - new Date(a.pelanggaran.tanggal).getTime());

    const improvements = bimbingan
      .filter(b => b.nipd === user.username)
      .map(b => ({ bimbingan: b, perbaikan: introspeksiMap.get(b.id_perbaikan) }))
      .filter((b): b is ImprovementWithData => !!b.perbaikan)
      .sort((a, b) => new Date(b.bimbingan.tanggal).getTime() - new Date(a.bimbingan.tanggal).getTime());

    const totalViolationPoints = violations.reduce((sum, v) => sum + v.sanksi.point_pelanggar, 0);
    const totalImprovementPoints = improvements.reduce((sum, i) => sum + i.perbaikan.point_perbaikan, 0);

    return { violations, improvements, totalViolationPoints, totalImprovementPoints };
  }, [user, pelanggaran, bimbingan, sanksi, introspeksi]);

  const totalPoints = Math.max(0, studentData.totalViolationPoints - studentData.totalImprovementPoints);

  const slidingIndicatorTransform = activeView === 'pelanggaran' ? 'translateX(0%)' : 'translateX(calc(100% + 0.25rem))';

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 10) return 'Selamat Pagi';
      if (hour >= 10 && hour < 14) return 'Selamat Siang';
      if (hour >= 14 && hour < 18) return 'Selamat Sore';
      return 'Selamat Malam';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.nama.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Selamat datang di dasbor kedisiplinan Anda.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Total Poin Pelanggaran" value={`-${studentData.totalViolationPoints}`} color="text-red-500" />
        <StatCard title="Total Poin Perbaikan" value={`+${studentData.totalImprovementPoints}`} color="text-green-500" />
        <StatCard title="Poin Saat Ini" value={totalPoints} color="text-primary-600 dark:text-primary-400" />
      </div>

      {/* Morphing Button */}
      <div className="flex justify-center">
        <div className="relative flex w-full max-w-sm p-1 mx-auto bg-gray-200 rounded-full dark:bg-gray-700">
          <div className="absolute top-1 left-1 bottom-1 w-[calc(50%-0.25rem)] bg-primary-600 rounded-full transition-transform duration-300 ease-in-out" style={{ transform: slidingIndicatorTransform }} />
          <button onClick={() => setActiveView('pelanggaran')} className={`relative z-10 w-1/2 py-2 text-sm font-semibold text-center transition-colors duration-300 rounded-full focus:outline-none ${activeView === 'pelanggaran' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
            Pelanggaran
          </button>
          <button onClick={() => setActiveView('perbaikan')} className={`relative z-10 w-1/2 py-2 text-sm font-semibold text-center transition-colors duration-300 rounded-full focus:outline-none ${activeView === 'perbaikan' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
            Perbaikan
          </button>
        </div>
      </div>

      {/* Data List */}
      <div className="transition-opacity duration-300">
        {activeView === 'pelanggaran' ? (
          <DataList title="Riwayat Pelanggaran" items={studentData.violations} icon={PelanggaranIcon} type="pelanggaran" />
        ) : (
          <DataList title="Riwayat Perbaikan" items={studentData.improvements} icon={BimbinganIcon} type="perbaikan" />
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
  <div className="p-5 overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
    <p className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">{title}</p>
    <p className={`mt-1 text-3xl font-semibold text-center ${color}`}>{value}</p>
  </div>
);

interface DataListProps {
  title: string;
  items: (ViolationWithData | ImprovementWithData)[];
  icon: React.ElementType;
  type: 'pelanggaran' | 'perbaikan';
}

const DataList: React.FC<DataListProps> = ({ title, items, icon: Icon, type }) => {
  const isPelanggaran = (item: any): item is ViolationWithData => type === 'pelanggaran';
  const pointClass = type === 'pelanggaran' ? 'text-red-500' : 'text-green-500';
  const pointPrefix = type === 'pelanggaran' ? '-' : '+';

  return (
    <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4 flow-root">
        {items.length > 0 ? (
          <ul role="list" className="-mb-8">
            {items.map((item, itemIdx) => {
              const date = isPelanggaran(item) ? item.pelanggaran.tanggal : item.bimbingan.tanggal;
              const description = isPelanggaran(item) ? item.sanksi.desk_kesalahan : item.perbaikan.desk_perbaikan;
              const points = isPelanggaran(item) ? item.sanksi.point_pelanggar : item.perbaikan.point_perbaikan;
              
              return (
                <li key={itemIdx}>
                  <div className="relative pb-8">
                    {itemIdx !== items.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex items-start space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                          <Icon className={`h-5 w-5 ${pointClass}`} aria-hidden="true" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{description}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                       <div className={`text-right text-sm font-bold whitespace-nowrap ${pointClass}`}>
                          {pointPrefix}{points} poin
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <p className="text-gray-500 dark:text-gray-400">Tidak ada data {type} yang tercatat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiswaDashboardPage;