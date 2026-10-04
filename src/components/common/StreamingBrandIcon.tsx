import React from 'react';

interface StreamingBrandIconProps {
  name: string;
  className?: string;
}

export const StreamingBrandIcon: React.FC<StreamingBrandIconProps> = ({ name, className = 'w-5 h-5' }) => {
  const lower = name.toLowerCase();

  // Netflix
  if (lower.includes('netflix')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#141414" />
        <path
          d="M6.5 4h2.5v16H6.5V4zm8.5 0h2.5v16H15V4z"
          fill="#E50914"
        />
        <path
          d="M6.5 4l8.5 16h2.5L9 4H6.5z"
          fill="#B81D24"
        />
        <path
          d="M6.5 4l8.5 16h-.2L6.5 4z"
          fill="#E50914"
        />
      </svg>
    );
  }

  // Apple TV / Apple TV+
  if (lower.includes('apple')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000000" />
        <path
          d="M15.2 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.7-1-2.7-4zm-2.2-6.5c.6-.8 1.1-1.9.9-3-.9.1-2.1.6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1.1.1 2.1-.5 2.7-1.3z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Max / HBO Max
  if (lower.includes('max') || lower.includes('hbo')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#002BE7" />
        <path
          d="M5 8.5h2.2l2.2 4.2 2.2-4.2h2.2v7h-2v-4.3l-2.4 4.3h-.1L6.9 11.2V15.5H5V8.5zm10.2 0H17l2.5 7h-2l-.5-1.6h-2.3l-.5 1.6h-1.9l2.4-7zm1.8 4l-.7-2.3-.7 2.3h1.4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Prime Video / Amazon
  if (lower.includes('prime') || lower.includes('amazon')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#00A8E1" />
        <path
          d="M6.5 9.5c0-.8.6-1.5 1.5-1.5h2.2c1.4 0 2.3.9 2.3 2.2 0 1.5-1 2.3-2.4 2.3H8v2.5H6.5V9.5zm1.5 2.1h1.8c.6 0 1-.3 1-.9 0-.6-.4-.9-1-.9H8v1.8zm6.5 2.8c-2.8 1.2-5.5 1.4-8 1.2-.3 0-.4-.4-.1-.5 2.6-1.2 5.5-1.3 8-.3.3.1.3.5.1.6zm.5-.5c.3-.4.8-.8 1.3-.9.1 0 .2.1.2.2 0 .5-.3 1.1-.6 1.4-.2.2-.4.1-.4-.1 0-.2-.2-.4-.5-.6z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Disney+
  if (lower.includes('disney')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#040714" />
        <path
          d="M12.5 5.5C8 5.5 6 9 6 12.5s2.5 6 6.5 6c2.5 0 4.2-.8 5.2-1.7-.3-.2-.7-.4-1-.7-.8.6-2.1 1.2-4.2 1.2-3.2 0-5-2.2-5-4.8 0-3 2.1-5.8 5.4-5.8 2.2 0 3.6 1.1 4 1.5.3-.4.7-.7 1.1-1-1.3-1.1-3.2-1.7-5.5-1.7z"
          fill="#113CCF"
        />
        <path
          d="M17.5 9.5v2h-2v1.5h2v2h1.5v-2h2v-1.5h-2v-2h-1.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Hulu
  if (lower.includes('hulu')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1CE783" />
        <path
          d="M6 7v10h2.5v-4.2h3V17H14V7h-2.5v4.3h-3V7H6zm9.5 4.5v5.5H18v-5.5h-2.5zm0-3.5h2.5v2h-2.5V8z"
          fill="#0B0C0F"
        />
      </svg>
    );
  }

  // Peacock
  if (lower.includes('peacock')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000000" />
        <circle cx="9" cy="8" r="2.2" fill="#F4B400" />
        <circle cx="15" cy="8" r="2.2" fill="#0F9D58" />
        <circle cx="12" cy="11.5" r="2.2" fill="#4285F4" />
        <circle cx="12" cy="16" r="2" fill="#DB4437" />
      </svg>
    );
  }

  // Paramount+
  if (lower.includes('paramount')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#0064FF" />
        <path
          d="M12 5.5l2.2 4.5 4.8.7-3.5 3.4.8 4.9-4.3-2.3-4.3 2.3.8-4.9-3.5-3.4 4.8-.7L12 5.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Generic / Default
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#4E562F" />
      <polygon points="9.5,7.5 16.5,12 9.5,16.5" fill="#FAF8F2" />
    </svg>
  );
};
