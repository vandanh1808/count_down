// -----------------------------
// File: app/admin/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "countdownTargetISO";

function toInputValue(d: Date) {
	// yyyy-MM-ddTHH:mm (local)
	const pad = (n: number) => String(n).padStart(2, "0");
	const yyyy = d.getFullYear();
	const MM = pad(d.getMonth() + 1);
	const dd = pad(d.getDate());
	const HH = pad(d.getHours());
	const mm = pad(d.getMinutes());
	return `${yyyy}-${MM}-${dd}T${HH}:${mm}`;
}

export default function AdminPage() {
	const [currentISO, setCurrentISO] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState<string>("");
	const [toast, setToast] = useState<string>("");

	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const saved =
			typeof window !== "undefined"
				? localStorage.getItem(STORAGE_KEY)
				: null;
		setCurrentISO(saved);
		if (saved) {
			const d = new Date(saved);
			setInputValue(toInputValue(d));
		}
	}, []);

	const pretty = useMemo(
		() =>
			currentISO
				? new Date(currentISO).toLocaleString(undefined, {
						dateStyle: "full",
						timeStyle: "short",
				  })
				: "(chưa thiết lập)",
		[currentISO]
	);

	const save = () => {
		if (!inputValue) return;
		const iso = new Date(inputValue).toISOString();
		localStorage.setItem(STORAGE_KEY, iso);
		setCurrentISO(iso);
		setToast("Đã lưu thời gian rời công ty ✓");
		setTimeout(() => setToast(""), 1800);
	};

	const clearAll = () => {
		localStorage.removeItem(STORAGE_KEY);
		setCurrentISO(null);
		setInputValue("");
		setToast("Đã xoá cấu hình thời gian");
		setTimeout(() => setToast(""), 1800);
	};

	if (!mounted) return null;

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
			<div className="mx-auto max-w-2xl px-6 py-12">
				<h1 className="text-3xl font-extrabold">
					Cài đặt thời gian rời công ty
				</h1>
				<p className="text-white/70 mt-2">
					Thiết lập mốc thời gian cho trang đếm ngược ở trang chủ.
				</p>

				<div className="mt-8 grid gap-4 rounded-3xl border border-white/15 bg-white/5 backdrop-blur p-6">
					<label className="text-sm text-white/80">
						Ngày & giờ (local)
					</label>
					<input
						type="datetime-local"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400"
					/>
					<div className="flex gap-3">
						<button
							onClick={save}
							className="rounded-xl bg-indigo-500/80 hover:bg-indigo-500 px-4 py-2 text-sm font-medium"
						>
							Lưu
						</button>
						<button
							onClick={clearAll}
							className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2 text-sm"
						>
							Xoá cấu hình
						</button>
						<a
							href="/"
							className="ml-auto rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-4 py-2 text-sm"
						>
							Về trang đếm ngược
						</a>
					</div>
				</div>

				<div className="mt-6 rounded-2xl border border-white/10 p-4 bg-white/5">
					<div className="text-xs uppercase tracking-widest text-white/60">
						Hiện đang đặt tới
					</div>
					<div className="mt-1 text-lg font-semibold">{pretty}</div>
					<div className="mt-2 text-white/60 text-sm">
						Lưu ý: Lưu ở <code>localStorage</code> (trình duyệt).
						Triển khai multi-user cần backend (DB/cookie/server
						actions).
					</div>
				</div>

				{toast && (
					<div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm backdrop-blur">
						{toast}
					</div>
				)}
			</div>
		</div>
	);
}
