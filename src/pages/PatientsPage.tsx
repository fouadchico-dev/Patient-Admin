import { useEffect, useState } from "react";

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", city: "" });

  const load = async () => {
    const list = await (window as any).api.patients.list(q);
    setItems(list);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await (window as any).api.patients.create({
      ...form,
      // birthDate: form.birthDate ? new Date(form.birthDate) : null,
    });
    setForm({ firstName: "", lastName: "", city: "" });
    await load();
  };

  const remove = async (id: string) => {
    await (window as any).api.patients.remove(id);
    await load();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Patients</h1>

      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="px-4 py-2 bg-slate-900 text-white rounded" onClick={load}>Search</button>
      </div>

      <div className="border rounded p-4 space-y-2 bg-white">
        <h2 className="font-semibold">New patient</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={create}>Create</button>
        </div>
      </div>

      <div className="bg-white border rounded">
        {items.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
            <div>
              <div className="font-semibold">{p.lastName}, {p.firstName}</div>
              <div className="text-sm text-slate-500">{p.city ?? "-"}</div>
            </div>
            <button className="px-3 py-1.5 bg-red-600 text-white rounded" onClick={() => remove(p.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
