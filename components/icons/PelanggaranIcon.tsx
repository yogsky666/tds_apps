
import React from 'react';

interface IconProps {
    className?: string;
}

export const PelanggaranIcon: React.FC<IconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655 9.75 21.75l-2.47-2.47m5.132-3.625L16.5 12l-2.47-2.47m5.132-3.625-2.47-2.47L9.75 3.75l1.662 6.105m0 0L3.75 9.75l2.47 2.47M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5" />
    </svg>
);
