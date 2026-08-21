"use client";

import StatCard from "./components/StatCard";
import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { useRouter } from "next/navigation";

export default function Home() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{
    filename: string;
    rows: number;
    columns: string[];
    stats: Record<string, { mean: number; min: number; max: number }>;
  } | null>(null);

  const [datasets, setDatasets] = useState <
    { id: number; filename: string; rows: number; columns: string[]; uploaded_at: string }[]
>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || data.error || "Something went wrong while analyzing the file.");
      return;
    }

    setResult(data);

    const datasetResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: data.filename,
        rows: data.rows,
        columns: data.columns,
      }),
    });

    const newDataset = await datasetResponse.json();
    setDatasets((prev) => [newDataset, ...prev]);
  }

  const chartData = result
    ? Object.entries(result.stats).map(([column, values]) => ({
        name: column,
        mean: values.mean,
        min: values.min,
        max: values.max,
      }))
    : [];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
      credentials: "include",
    }).then((res) => {
      if (!res.ok) {
        router.push("/login");
        return;
      }

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => setDatasets(data));
    });
  }, []);

  async function handleLogout() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  }

  async function deleteDataset(id: number) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    setDatasets((prev) => prev.filter((d) => d.id !== id));
  }

  return (
  <div className="min-h-screen bg-background text-foreground flex flex-col gap-6 max-w-4xl mx-auto px-6 py-10">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Upload your data, get charts and automatic summaries.
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-foreground/60 hover:text-foreground border border-hairline rounded-md px-3 py-1.5"
      >
        Logout
      </button>
    </div>

    <div className="flex gap-4">
      <StatCard label="Datasets" value="24" />
      <StatCard label="Total Rows" value="1.2M" />
      <StatCard label="Reports" value="7" />
    </div>

    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
      }}
      className="border border-dashed border-hairline rounded-lg px-8 py-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-rust transition-colors"
    >
      <p className="font-serif text-lg">
        {fileName ? fileName : "Drop your file here"}
      </p>
      <p className="text-foreground/50 text-sm mt-1">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />
    </div>

    {result && (
      <div className="border border-hairline rounded-lg px-5 py-4 flex flex-col gap-3">
        <p className="text-sm text-foreground/60">Rows: {result.rows}</p>
        <p className="text-sm text-foreground/60">Columns: {result.columns.join(", ")}</p>

        {Object.entries(result.stats).map(([column, values]) => (
          <div key={column} className="border-t border-hairline pt-2">
            <p className="text-sm font-medium">{column}</p>
            <p className="text-xs text-foreground/50">
              mean: {values.mean} · min: {values.min} · max: {values.max}
            </p>
          </div>
        ))}

        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#a39c8c" />
              <YAxis stroke="#a39c8c" />
              <Legend />
              <Bar dataKey="min" fill="#d9a48c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mean" fill="#b5502e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" fill="#7a3419" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )}

    {datasets.length > 0 && (
      <div className="border border-hairline rounded-lg px-5 py-4">
        <h2 className="text-sm text-foreground/60 uppercase tracking-wide mb-3">
          Your Datasets
        </h2>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {datasets.map((d) => (
            <div
              key={d.id}
              className="border-t border-hairline pt-2 flex justify-between items-center text-sm"
            >
              <span>{d.filename}</span>
              <div className="flex items-center gap-3">
                <span className="text-foreground/50">{d.rows} rows</span>
                <button
                  onClick={() => deleteDataset(d.id)}
                  className="text-rust hover:text-rust-dark text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}