import React from 'react';
import type { ReportCategory } from '../types/report';

export type CategoryIconKey =
  | 'trash'
  | 'parking'
  | 'road_closure'
  | 'water'
  | 'animal'
  | 'pests'
  | 'pothole'
  | 'flood'
  | 'streetlight';

export function getCategoryIconKey(category: ReportCategory): CategoryIconKey {
  switch (category) {
    case 'Trash & Collection':
      return 'trash';
    case 'Double Parking & Driveway':
      return 'parking';
    case 'Road Closure & Events':
      return 'road_closure';
    case 'Drinking Water & Leaks':
      return 'water';
    case 'Animal Welfare':
      return 'animal';
    case 'Pests, Trees & Vandalism':
      return 'pests';
    case 'Road Damage / Pothole':
      return 'pothole';
    case 'Street Flooding':
      return 'flood';
    case 'Broken Streetlight':
      return 'streetlight';
    default:
      return 'trash';
  }
}

export const CategorySvgIcon: React.FC<{ iconKey: CategoryIconKey; className?: string }> = ({
  iconKey,
  className = 'w-10 h-10',
}) => {
  switch (iconKey) {
    case 'trash':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M12.5 13.5h15l-1.4 15.5a2 2 0 0 1-2 1.8h-8.2a2 2 0 0 1-2-1.8l-1.4-15.5Z" fill="#1177F0" />
          <rect x="10.5" y="10.8" width="19" height="3" rx="1.5" fill="#154792" />
          <path d="M17 8.5h6v2.3h-6V8.5Z" fill="#5EABF0" />
          <path d="M16.8 17.5v8.5M20 17.5v8.5M23.2 17.5v8.5" stroke="#FEFFFE" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'parking':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M9.5 21.5l2.3-5.6a2.3 2.3 0 0 1 2.1-1.4h10.2a2.3 2.3 0 0 1 2.1 1.4l2.3 5.6v5.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V25H13.5v2a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-5.5Z" fill="#154792" />
          <path d="M13 16.5h12l1.3 3.2H11.7l1.3-3.2Z" fill="#5EABF0" />
          <circle cx="13.8" cy="22.8" r="1.5" fill="#FBE95C" />
          <circle cx="24.2" cy="22.8" r="1.5" fill="#FBE95C" />
          <circle cx="29" cy="11.5" r="5" fill="#1177F0" />
          <path d="M27 11.5h4" stroke="#FEFFFE" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'road_closure':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <rect x="9" y="13" width="22" height="7" rx="2" fill="#FBE95C" stroke="#154792" strokeWidth="1.3" />
          <path d="M13.5 13.5l-2 6M19 13.5l-2 6M24.5 13.5l-2 6M29.5 14l-1.5 5.5" stroke="#154792" strokeWidth="2" />
          <path d="M13 20v10M27 20v10" stroke="#154792" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10 30h6M24 30h6" stroke="#1177F0" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M20 9.5c0 0-7.6 8.8-7.6 13.8a7.6 7.6 0 0 0 15.2 0C27.6 18.3 20 9.5 20 9.5Z" fill="#1177F0" />
          <path d="M16.5 23.3a3.5 3.5 0 0 0 3.5 3.5" stroke="#FBE95C" strokeWidth="2" strokeLinecap="round" />
          <rect x="9" y="13" width="7" height="3" rx="1" fill="#154792" />
        </svg>
      );
    case 'animal':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <circle cx="13.2" cy="15.2" r="2.3" fill="#1177F0" />
          <circle cx="18" cy="12.2" r="2.3" fill="#1177F0" />
          <circle cx="23" cy="12.5" r="2.3" fill="#1177F0" />
          <circle cx="26.8" cy="15.8" r="2.3" fill="#1177F0" />
          <path d="M14.8 24c0-3 2.3-5.2 5.2-5.2s5.2 2.2 5.2 5.2c0 2.3-1.8 4-3.7 4-.8 0-1.1-.4-1.5-.4s-.7.4-1.5.4c-1.9 0-3.7-1.7-3.7-4Z" fill="#154792" />
          <circle cx="20" cy="24.2" r="1.4" fill="#FBE95C" />
        </svg>
      );
    case 'pests':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <rect x="18.3" y="22.5" width="3.4" height="8.5" rx="1" fill="#154792" />
          <circle cx="20" cy="15.5" r="6.8" fill="#1177F0" />
          <circle cx="14.5" cy="18.5" r="4.5" fill="#5EABF0" />
          <circle cx="25.5" cy="18.5" r="4.5" fill="#5EABF0" />
          <circle cx="27.5" cy="12" r="3" fill="#FBE95C" />
        </svg>
      );
    case 'streetlight':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M14 31V14a4 4 0 0 1 4-4h6" stroke="#154792" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="25" cy="12" rx="4" ry="2.4" fill="#FBE95C" stroke="#154792" strokeWidth="1.2" />
          <path d="M22 16l-2 4M25 16v5M28 16l2 4" stroke="#1177F0" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'flood':
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M9 22c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 4 0" stroke="#1177F0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9 27c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 4 0" stroke="#154792" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20 10l4 6h-8l4-6Z" fill="#FBE95C" stroke="#154792" strokeWidth="1.3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
          <rect x="3" y="3" width="34" height="34" rx="11" fill="#F3F7FD" />
          <path d="M20 9.5L30.5 28H9.5L20 9.5Z" fill="#154792" />
          <path d="M20 16v5" stroke="#FEFFFE" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="20" cy="24.5" r="1.5" fill="#FBE95C" />
        </svg>
      );
  }
};

export function getMapMarkerSvgHtml(iconKey: CategoryIconKey): string {
  switch (iconKey) {
    case 'trash':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
    case 'parking':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
    case 'road_closure':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="6" rx="1"/><path d="M7 12v7"/><path d="M17 12v7"/></svg>`;
    case 'water':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
    case 'animal':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>`;
    case 'pests':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>`;
    case 'streetlight':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
    case 'flood':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>`;
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
  }
}
