import React from 'react';
import { User } from '../types';

interface AvatarProps {
  user: Pick<User, 'nama' | 'photo' | 'username'>;
  className?: string;
}

// Generates a consistent, visually pleasing color from a string (e.g., username)
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure 32bit integer
  }
  
  // Tweak the hash to create more vibrant and less muddy colors
  const vibrantHash = (hash * 381) % 360; // Use hue value from 0 to 359
  const saturation = 70; // Saturation in HSL
  const lightness = 45; // Lightness in HSL

  return `hsl(${vibrantHash}, ${saturation}%, ${lightness}%)`;
};


// Function to get contrasting text color (black or white) for accessibility
export const getContrastColor = (hslColor: string) => {
    // Extract lightness from HSL string
    const lightnessMatch = hslColor.match(/(\d+)%\)$/);
    if (!lightnessMatch) return '#FFFFFF'; // Default to white if regex fails
    const lightness = parseInt(lightnessMatch[1], 10);
	return (lightness > 55) ? '#000000' : '#FFFFFF';
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.trim().split(' ');
  if (names.length === 1 && names[0] === '') return '?';
  const initials = names.map(n => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ user, className }) => {
  if (user.photo) {
    return (
      <img
        className={`object-cover ${className}`}
        src={user.photo}
        alt={`${user.nama}'s avatar`}
        onError={(e) => {
            // In case of a broken image link, hide it. The parent component will handle it.
            (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  const initials = getInitials(user.nama);
  const bgColor = stringToColor(user.username); // Use username for a consistent color
  const textColor = getContrastColor(bgColor);

  return (
    <div
      className={`flex items-center justify-center font-bold select-none ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
      title={user.nama}
    >
      <span>{initials}</span>
    </div>
  );
};