import React from 'react';

interface IconProps {
    className?: string;
}

export const ClassIcon: React.FC<IconProps> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm1.125 0h.009v.008h-.009v-.008Zm-12 0h.009v.008h-.009v-.008ZM4.5 5.625c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H5.625C5.004 8.25 4.5 7.746 4.5 7.125v-1.5Z" />
    </svg>
);
