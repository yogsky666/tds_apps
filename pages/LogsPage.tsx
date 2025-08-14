import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Log, LogAction, LogEntity, User } from '../types';
import { Avatar } from '../components/Avatar';
import * as XLSX from 'xlsx';
import { DownloadIcon } from '../components/icons/DownloadIcon';

const ITEMS_PER_PAGE = 15;

const LogActionBadge: React.FC<{ action: LogAction }> = ({ action }) => {
    const colors: Record<LogAction, string> = {
        [LogAction.TAMBAH]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [LogAction.IMPORT]: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
        [LogAction.UBAH]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [LogAction.HAPUS]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [LogAction.EXPORT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [LogAction.LOGIN]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        [LogAction.LOGOUT]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium capitalize rounded-full ${colors[action]}`}>{action}</span>;
};

const LogsPage: React.FC = () => {
    const { logs, users, addLog } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        user: 'all',
        action: 'all',
        entity: 'all',
    });

    const userMap = useMemo(() => new Map(users.map(u => [u.username, u])), [users]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if(startDate) startDate.setHours(0,0,0,0);
            if(endDate) endDate.setHours(23,59,59,999);

            if (startDate && logDate < startDate) return false;
            if (endDate && logDate > endDate) return false;
            if (filters.user !== 'all' && log.username !== filters.user) return false;
            if (filters.action !== 'all' && log.action !== filters.action) return false;
            if (filters.entity !== 'all' && log.entity !== filters.entity) return false;
            
            return true;
        });
    }, [logs, filters]);
    
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLogs, currentPage]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExportExcel = () => {
        const dataToExport = filteredLogs.map((log, index) => {
            const user = userMap.get(log.username);
            return {
                'No.': index + 1,
                'Timestamp': new Date(log.timestamp).toLocaleString('id-ID'),
                'Pengguna': user?.nama || log.username,
                'Username': log.username,
                'Aksi': log.action,
                'Entitas': log.entity,
                'Rincian': log.details,
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        if (dataToExport.length > 0) {
            const header = Object.keys(dataToExport[0]);
            const wscols = header.map(key => ({
                wch: Math.max(key.length, ...dataToExport.map(row => (row[key as keyof typeof row] ?? '').toString().length)) + 2
            }));
            worksheet['!cols'] = wscols;
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Log Aktivitas");

        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = `Log_Aktivitas_${formattedDate}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
        addLog(LogAction.EXPORT, LogEntity.LAPORAN, `Mengekspor ${dataToExport.length} data log aktivitas.`);
    };

    const inputStyle = "w-full px-3 py-2 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Log Aktivitas</h1>
            
            <div className="p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={inputStyle}/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} min={filters.startDate} className={inputStyle}/>
                    <select name="user" value={filters.user} onChange={handleFilterChange} className={inputStyle}>
                        <option value="all">Semua Pengguna</option>
                        {Array.from(new Set(logs.map(l => l.username))).map(username => (
                            <option key={username} value={username}>{userMap.get(username)?.nama || username}</option>
                        ))}
                    </select>
                    <select name="action" value={filters.action} onChange={handleFilterChange} className={inputStyle}>
                        <option value="all">Semua Aksi</option>
                        {Object.values(LogAction).map(action => <option key={action} value={action}>{action}</option>)}
                    </select>
                    <select name="entity" value={filters.entity} onChange={handleFilterChange} className={inputStyle}>
                        <option value="all">Semua Entitas</option>
                        {Object.values(LogEntity).map(entity => <option key={entity} value={entity}>{entity}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={handleExportExcel} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow-md dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Timestamp</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Pengguna</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Aksi</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Entitas</th>
                            <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Rincian</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {paginatedLogs.map(log => {
                            const loggedUser = userMap.get(log.username);
                            return (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {loggedUser ? (
                                            <div className="flex items-center">
                                                <Avatar user={loggedUser} className="w-8 h-8 rounded-full" />
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{loggedUser.nama}</div>
                                                    <div className="text-xs text-gray-500 font-mono dark:text-gray-400">{loggedUser.username}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            log.username
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap"><LogActionBadge action={log.action} /></td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">{log.entity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{log.details}</td>
                                </tr>
                            );
                        })}
                        {paginatedLogs.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Tidak ada log yang cocok dengan filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

             {totalPages > 1 && (
                <nav className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-md" aria-label="Pagination">
                    <div className="hidden sm:block">
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                            Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)}</span> of{' '}
                            <span className="font-medium">{filteredLogs.length}</span> results
                        </p>
                    </div>
                    <div className="flex justify-between flex-1 sm:justify-end">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Previous</button>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Next</button>
                    </div>
                </nav>
            )}
        </div>
    );
};

export default LogsPage;
