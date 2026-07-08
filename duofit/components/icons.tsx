import React from "react";

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const HomeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
  </svg>
);

export const PenIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20c.5-3 1.5-9 6-13.5C13 4 16 3 19 3c.5 0 1 .3 1 1 0 3-1 6-3.5 9C12 17.5 7 19.5 4 20Z" />
    <path d="M4 20c2-4 5-8 9-11" />
  </svg>
);

export const DumbbellIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="2.5" y="9" width="3.4" height="6" rx="1" />
    <rect x="6.6" y="7" width="3.4" height="10" rx="1" />
    <rect x="14" y="7" width="3.4" height="10" rx="1" />
    <rect x="18.1" y="9" width="3.4" height="6" rx="1" />
    <path d="M10 12h4" />
  </svg>
);

export const PersonIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="7.5" r="3" />
    <path d="M6 20c.5-4 3-6.5 6-6.5s5.5 2.5 6 6.5" />
  </svg>
);

export const BarsIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 20v-5" />
    <path d="M10 20V10" />
    <path d="M15 20v-7" />
    <path d="M20 20V6" />
  </svg>
);

export const ScaleIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4v3" />
    <path d="M5 7h14" />
    <path d="M7 7l-2.5 5a2.6 2.6 0 0 0 5 0L7 7Z" />
    <path d="M17 7l-2.5 5a2.6 2.6 0 0 0 5 0L17 7Z" />
    <path d="M12 7v11" />
    <path d="M8.5 18h7" />
  </svg>
);

export const CheckCircleIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.3 2.3 4.7-5" />
  </svg>
);

export const CameraIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <path d="M9 7l1.2-2h3.6L15 7" />
    <circle cx="12" cy="13.2" r="3.4" />
  </svg>
);

export const HeartIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20s-7-4.5-8.7-9.2C2.2 7.7 4.2 5 7 5c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 2.8 0 4.8 2.7 3.7 5.8C19 15.5 12 20 12 20Z" />
  </svg>
);

export const DotsIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="19" cy="12" r="1.7" />
  </svg>
);

export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </svg>
);

export const ChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />
  </svg>
);

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const XIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const TrashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.5 7h15" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const TrophyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H5.5a0 0 0 0 0 0 0c0 2.5 1 4 2.8 4.4M16 5h2.5c0 2.5-1 4-2.8 4.4" />
    <path d="M12 13v3.5" />
    <path d="M8.5 20c.5-2 1.8-3.5 3.5-3.5s3 1.5 3.5 3.5h-7Z" />
  </svg>
);

export const RunIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="14.5" cy="5" r="1.8" />
    <path d="M9 20.5 11.5 15l-2-1.5c-1-1 0-3 1.5-4l3-1.5 3 2.5 2.5.5" />
    <path d="M11.5 15l3 2 1 3.5" />
    <path d="M4.5 13.5 8 12" />
  </svg>
);
