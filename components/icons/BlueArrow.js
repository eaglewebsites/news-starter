// components/icons/BlueArrow.js
export default function BlueArrow({ className = "" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`ml-[4px] transition-transform duration-150 ease-out group-hover:translate-x-[2px] ${className}`}
    >
      {/* Simple right-pointing triangle */}
      <path d="M4 2L10 7L4 12V2Z" fill="#1E99D0" />
    </svg>
  );
}

