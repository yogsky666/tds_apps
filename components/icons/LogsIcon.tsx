
import React from 'react';

interface IconProps {
    className?: string;
}

export const LogsIcon: React.FC<IconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.528 3.972a8.958 8.958 0 0 1 4.944 0M14.472 20.028a8.958 8.958 0 0 1-4.944 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.972 9.528a8.958 8.958 0 0 1 0 4.944m16.056-4.944a8.958 8.958 0 0 1 0 4.944" />
    </svg>
);
