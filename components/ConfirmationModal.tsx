import React from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { WarningIcon } from './icons/WarningIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      aria-labelledby="confirmation-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-6 mx-auto bg-white rounded-2xl shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full dark:bg-red-900/30">
                <WarningIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 id="confirmation-modal-title" className="mt-5 text-xl font-semibold text-gray-900 dark:text-white">
                {title}
            </h3>
            <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                   {message}
                </p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-8">
            <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-3 font-semibold text-gray-700 transition-colors duration-200 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-gray-100 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:focus:ring-offset-gray-800"
            >
                Batal
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="w-full px-4 py-3 font-semibold text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                {confirmText || 'Hapus'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;