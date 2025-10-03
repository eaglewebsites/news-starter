export default function SectionHeading({ children, variant = "nav", className = "" }) {
  const underline =
    variant === "more" ? "section-underline-more" : "section-underline-nav";
  return (
    <h2 className={`font-bold ${underline} ${className}`}>
      {children}
    </h2>
  );
}
