export default function AdSlot({ network = "taboola", slot = "default" }) {
  return (
    <div className="border rounded p-4 text-center" style={{ background:'#f7f7f7' }}>
      {/* Placeholder only. Replace with Taboola / GAM tags later. */}
      <strong>Ad Slot:</strong> {network} / {slot}
    </div>
  );
}
