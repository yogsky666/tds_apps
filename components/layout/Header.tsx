import React from 'react';
import ThemeToggle from '../ThemeToggle';
import { MenuIcon } from '../icons/MenuIcon';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
    const { user } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 10) {
            return 'Pagi';
        } else if (hour >= 10 && hour < 14) {
            return 'Siang';
        } else if (hour >= 14 && hour < 18) {
            return 'Sore';
        } else {
            return 'Malam';
        }
    };
    
    // Use only the first name for the greeting to keep it concise
    const greeting = user ? `Selamat ${getGreeting()}, ${user.nama.split(' ')[0] || ''}!` : '';

    return (
        <div className="relative z-10 flex flex-shrink-0 h-16 bg-white shadow dark:bg-gray-800">
            <button
                type="button"
                className="px-4 text-gray-500 border-r border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
                onClick={() => setSidebarOpen(true)}
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="w-6 h-6" aria-hidden="true" />
            </button>
            <div className="flex items-center justify-end flex-1 px-4 sm:px-6 md:px-8">
                <div className="flex items-center ml-auto space-x-4">
                    {user && (
                        <span className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 select-none">
                            {greeting}
                        </span>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
};

export default Header;