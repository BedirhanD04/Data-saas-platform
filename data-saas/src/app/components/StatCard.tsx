type StatCardProps = {
  label: string;
  value: string;
};

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="border border-hairline rounded-lg px-5 py-4">
      <p className="text-xs text-foreground/50 uppercase tracking-wide">{label}</p>
      <p className="font-serif text-2xl mt-1">{value}</p>
    </div>
  );
}