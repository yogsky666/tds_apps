
import React from 'react';

interface IconProps {
    className?: string;
}

export const UsersIcon: React.FC<IconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-2.272M15 19.128v-3.872M15 19.128L11.625 15.75M9 12.375c0-1.036.267-2.016.75-2.875M9 12.375c0 1.036.267 2.016.75 2.875m0 0A3.375 3.375 0 0 1 12 15.75c1.16 0 2.21-.416 3-1.125m-6 0v-3.872m0 3.872L5.625 15.75M3.375 12a9.375 9.375 0 0 1 17.25 0c0 1.036-.267 2.016-.75 2.875M3.375 12c0-1.036.267-2.016.75-2.875M3.375 12L7.5 15.75m6-3.375a3.375 3.375 0 0 0-3-3.375m3 3.375a3.375 3.375 0 0 0 3-3.375M1.5 12a10.875 10.875 0 0 1 21 0c0 4.016-2.04 7.5-5.063 9.45" />
    </svg>
);
