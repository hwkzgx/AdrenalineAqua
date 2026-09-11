export default function StatCard({ title, value }) {
  return (
    <div className="card">
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  );
}