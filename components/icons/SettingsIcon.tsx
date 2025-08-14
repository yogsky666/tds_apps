
import React from 'react';

interface IconProps {
    className?: string;
}

export const SettingsIcon: React.FC<IconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.55-.22a2.25 2.25 0 0 1 2.986 1.637l.414 2.165M10.343 3.94a2.25 2.25 0 0 0-2.224 2.224l-.123 2.257a2.25 2.25 0 0 1-2.224 2.224H3.75m1.5-4.5h.008v.008H5.25v-.008ZM15 3.75a2.25 2.25 0 0 1 2.25 2.25v.008a2.25 2.25 0 0 1-2.25 2.25h-3.874a2.25 2.25 0 0 1-2.224-2.224l-.123-2.257a2.25 2.25 0 0 1 2.224-2.224h5.334ZM8.25 12h7.5M8.25 15h7.5M12 17.25h.008v.008H12v-.008Zm0 2.25h.008v.008H12v-.008ZM9.75 21.75h4.5a2.25 2.25 0 0 0 2.25-2.25v-5.25a2.25 2.25 0 0 0-2.25-2.25h-4.5a2.25 2.25 0 0 0-2.25 2.25V19.5a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
);
