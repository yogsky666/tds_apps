
import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';
import { DefaultLogoIcon } from '../components/icons/DefaultLogoIcon';
import { DashboardIcon } from '../components/icons/DashboardIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { ExportIcon } from '../components/icons/ExportIcon';

const LandingPage: React.FC = () => {
    const { settings } = useSettings();
    const { theme } = useTheme();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <Link to="/" className="-m-1.5 p-1.5 flex items-center">
                            {settings.appLogo ? (
                                <img className="w-auto h-8" src={settings.appLogo} alt={settings.appName} />
                            ) : (
                                <DefaultLogoIcon className="w-auto h-8 text-primary-600 dark:text-primary-500" />
                            )}
                            <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">{settings.appName}</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-x-4">
                        <ThemeToggle />
                        <Link to="/login" className="px-4 py-2 text-sm font-semibold leading-6 text-white rounded-md shadow-sm bg-primary-600 hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                            Sign in <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                </nav>
            </header>

            <main>
                {/* Hero section */}
                <div className="relative isolate pt-14">
                    <div className="absolute inset-x-0 overflow-hidden -top-40 -z-10 transform-gpu blur-3xl sm:-top-80" aria-hidden="true">
                        <div className={`relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] dark:opacity-20`} style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
                    </div>
                    <div className="py-24 sm:py-32 lg:pb-40">
                        <div className="px-6 mx-auto max-w-7xl lg:px-8">
                            <div className="max-w-2xl mx-auto text-center">
                                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
                                    Manajemen Kedisiplinan Siswa Menjadi Lebih Mudah
                                </h1>
                                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                                    Aplikasi terpusat untuk mencatat, memantau, dan menganalisis perilaku siswa secara efisien, membantu menciptakan lingkungan belajar yang lebih baik.
                                </p>
                                <div className="flex items-center justify-center mt-10 gap-x-6">
                                    <Link to="/login" className="px-5 py-3 text-base font-semibold text-white rounded-md shadow-sm bg-primary-600 hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
                                        Mulai Sekarang
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features section */}
                <div className="py-24 bg-white sm:py-32 dark:bg-gray-800">
                    <div className="px-6 mx-auto max-w-7xl lg:px-8">
                        <div className="max-w-2xl mx-auto lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-primary-600 dark:text-primary-400">Semua dalam Satu</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                                Fitur Lengkap untuk Sekolah Anda
                            </p>
                        </div>
                        <div className="max-w-2xl mx-auto mt-16 sm:mt-20 lg:mt-24 lg:max-w-4xl">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                        <div className="absolute top-0 left-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
                                            <DashboardIcon className="w-6 h-6 text-white" />
                                        </div>
                                        Dashboard Canggih
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">Dapatkan wawasan real-time dan bulanan tentang tren pelanggaran, siswa teratas, dan analisis per kelas melalui visualisasi data yang interaktif.</dd>
                                </div>
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                        <div className="absolute top-0 left-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
                                            <UsersIcon className="w-6 h-6 text-white" />
                                        </div>
                                        Akses Berbasis Peran
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">Sistem manajemen pengguna yang aman dengan peran Admin dan Tim Disiplin Siswa (TDS), memastikan setiap pengguna hanya mengakses fitur yang relevan.</dd>
                                </div>
                                <div className="relative pl-16">
                                    <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                                        <div className="absolute top-0 left-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600">
                                            <ExportIcon className="w-6 h-6 text-white" />
                                        </div>
                                        Laporan Lengkap
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">Ekspor berbagai jenis laporan dalam format Excel (.xlsx), PDF, dan gambar (.png) untuk analisis lebih lanjut atau keperluan dokumentasi.</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 bg-gray-50 dark:bg-gray-900">
                <div className="px-6 mx-auto max-w-7xl lg:px-8">
                    <div className="text-center">
                        <p className="text-sm leading-5 text-gray-500 dark:text-gray-400">
                            &copy; {new Date().getFullYear()} {settings.appName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
