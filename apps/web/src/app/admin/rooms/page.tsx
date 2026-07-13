"use client";

import { useEffect, useState } from "react";
import { AREA } from "@/lib/area-labels";
import { Button } from "@/components/ui/button";

interface Area {
  id: string;
  name: string;
  description: string | null;
  _count?: { devices: number };
}

export default function AreasAdminPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    const res = await fetch("/api/rooms");
    if (res.ok) setAreas(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setName("");
    setDescription("");
    load();
  }

  function startEdit(area: Area) {
    setEditingId(area.id);
    setEditName(area.name);
    setEditDescription(area.description || "");
  }

  async function saveEdit(id: string) {
    await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription }),
    });
    setEditingId(null);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold text-foreground">{AREA.plural}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{AREA.description}</p>

      <form onSubmit={handleAdd} className="card mb-6 space-y-4">
        <h2 className="font-semibold text-foreground">{AREA.add}</h2>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Front Garden, Kitchen, Driveway"
            required
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          {AREA.add}
        </button>
      </form>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map((area) => (
            <div key={area.id} className="card">
              {editingId === area.id ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{AREA.edit}</h3>
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => saveEdit(area.id)}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{area.name}</h3>
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(area)}>
                      {AREA.edit}
                    </Button>
                  </div>
                  {area.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {area._count?.devices ?? 0} device(s)
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
