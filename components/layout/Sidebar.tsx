import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { DefaultLogoIcon } from '../icons/DefaultLogoIcon';
import { DashboardIcon } from '../icons/DashboardIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { ClassIcon } from '../icons/ClassIcon';
import { SanksiIcon } from '../icons/SanksiIcon';
import { IntrospeksiIcon } from '../icons/IntrospeksiIcon';
import { SiswaIcon } from '../icons/SiswaIcon';
import { PelanggaranIcon } from '../icons/PelanggaranIcon';
import { BimbinganIcon } from '../icons/BimbinganIcon';
import { ProfileIcon } from '../icons/ProfileIcon';
import { ExportIcon } from '../icons/ExportIcon';
import { LogsIcon } from '../icons/LogsIcon';
import { Avatar } from '../Avatar';
import { Role } from '../../types';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const adminNavigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { name: 'Pengguna', href: '/app/users', icon: UsersIcon },
  { name: 'Siswa', href: '/app/siswa', icon: SiswaIcon },
  { name: 'Kelas', href: '/app/kelas', icon: ClassIcon },
  { name: 'Sanksi', href: '/app/sanksi', icon: SanksiIcon },
  { name: 'Introspeksi', href: '/app/introspeksi', icon: IntrospeksiIcon },
  { name: 'Bimbingan', href: '/app/bimbingan', icon: BimbinganIcon },
  { name: 'Pelanggaran', href: '/app/pelanggaran', icon: PelanggaranIcon },
  { name: 'Export', href: '/app/export', icon: ExportIcon },
  { name: 'Log Aktivitas', href: '/app/logs', icon: LogsIcon },
  { name: 'Profil', href: '/app/profile', icon: ProfileIcon },
  { name: 'Pengaturan', href: '/app/pengaturan', icon: SettingsIcon },
];

const tdsNavigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { name: 'Siswa', href: '/app/siswa', icon: SiswaIcon },
  { name: 'Kelas', href: '/app/kelas', icon: ClassIcon },
  { name: 'Sanksi', href: '/app/sanksi', icon: SanksiIcon },
  { name: 'Introspeksi', href: '/app/introspeksi', icon: IntrospeksiIcon },
  { name: 'Bimbingan', href: '/app/bimbingan', icon: BimbinganIcon },
  { name: 'Pelanggaran', href: '/app/pelanggaran', icon: PelanggaranIcon },
  { name: 'Export', href: '/app/export', icon: ExportIcon },
  { name: 'Profil', href: '/app/profile', icon: ProfileIcon },
];

const guruNavigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { name: 'Siswa', href: '/app/siswa', icon: SiswaIcon },
  { name: 'Kelas', href: '/app/kelas', icon: ClassIcon },
  { name: 'Sanksi', href: '/app/sanksi', icon: SanksiIcon },
  { name: 'Introspeksi', href: '/app/introspeksi', icon: IntrospeksiIcon },
  { name: 'Bimbingan', href: '/app/bimbingan', icon: BimbinganIcon },
  { name: 'Pelanggaran', href: '/app/pelanggaran', icon: PelanggaranIcon },
  { name: 'Profil', href: '/app/profile', icon: ProfileIcon },
];

const siswaNavigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: DashboardIcon },
  { name: 'Profil', href: '/app/profile', icon: ProfileIcon },
];

const NavItem: React.FC<{item: typeof adminNavigation[0], onClick: () => void}> = ({ item, onClick }) => (
    <NavLink
        to={item.href}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors duration-150 ${
            isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`
        }
    >
        <item.icon className="w-6 h-6 mr-3" aria-hidden="true" />
        {item.name}
    </NavLink>
);


const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const getNavigationForRole = (role?: Role) => {
        switch (role) {
            case Role.SUPER_ADMIN:
            case Role.ADMIN:
                return adminNavigation;
            case Role.TDS:
                return tdsNavigation;
            case Role.GURU:
                return guruNavigation;
            case Role.SISWA:
                return siswaNavigation;
            default:
                return [];
        }
    };
    const navigation = getNavigationForRole(user?.role);


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const closeSidebar = () => setSidebarOpen(false);

    const sidebarContent = (
        <div className="flex flex-col flex-1 min-h-0 bg-gray-800">
            <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                    {settings.appLogo ? (
                        <img src={settings.appLogo} alt="App Logo" className="w-auto h-8" />
                    ) : (
                        <DefaultLogoIcon className="w-auto h-8 text-white" />
                    )}
                    <span className="ml-3 text-xl font-semibold text-white">{settings.appName}</span>
                </div>
                <nav className="flex-1 px-2 mt-5 space-y-1">
                    {navigation.map((item) => (
                        <NavItem key={item.name} item={item} onClick={closeSidebar}/>
                    ))}
                </nav>
            </div>
            <div className="flex flex-shrink-0 p-4 border-t border-gray-700">
                <div className="flex-shrink-0 w-full group">
                    <div className="flex items-center">
                        {user && <Avatar user={user} className="inline-block w-10 h-10 rounded-full" />}
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">{user?.nama}</p>
                            <p className="text-xs font-medium text-gray-400 capitalize group-hover:text-gray-300">{user?.role}</p>
                        </div>
                         <button
                            onClick={handleLogout}
                            className="inline-flex items-center justify-center w-10 h-10 ml-auto text-gray-400 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                            title="Logout"
                         >
                            <span className="sr-only">Logout</span>
                            <LogoutIcon className="w-6 h-6" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

  return (
    <>
        {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={closeSidebar} aria-hidden="true"></div>
            <div className="relative flex flex-col flex-1 w-full max-w-xs">
                {sidebarContent}
            </div>
             <div className="flex-shrink-0 w-14" aria-hidden="true">
                {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
        </div>

        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-64">
                {sidebarContent}
            </div>
        </div>
    </>
  );
};

export default Sidebar;