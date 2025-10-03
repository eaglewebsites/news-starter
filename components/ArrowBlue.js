export default function ArrowBlue({ className = "h-3 w-3" }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      {/* Single path approximating a triangle with ~2px rounded corners */}
      <path
        d="M5 3
           Q4 3 4 4
           L4 12
           Q4 13 5 13
           L11.2 8.8
           Q12 8 11.2 7.2
           Z"
        fill="#1E99D0"
      />
    </svg>
  );
}
