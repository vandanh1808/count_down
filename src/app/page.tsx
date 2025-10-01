// File: app/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ---- Helpers ----
function getTimeParts(diffMs: number) {
	const clamp = Math.max(0, diffMs);
	const days = Math.floor(clamp / (24 * 60 * 60 * 1000));
	const hours = Math.floor(
		(clamp % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
	);
	const minutes = Math.floor((clamp % (60 * 60 * 1000)) / (60 * 1000));
	const seconds = Math.floor((clamp % (60 * 1000)) / 1000);
	const millis = clamp % 1000;
	return { days, hours, minutes, seconds, millis };
}
function pad(n: number, width: number = 2) {
	return n.toString().padStart(width, "0");
}

// ---- Digit with flip ----
const Digit: React.FC<{ value: string; label?: string }> = ({
	value,
	label,
}) => (
	<div className="flex flex-col items-center">
		<div className="relative w-20 h-24 sm:w-24 sm:h-28 perspective">
			<div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl overflow-hidden">
				<AnimatePresence mode="popLayout">
					<motion.div
						key={value}
						initial={{
							rotateX: -90,
							opacity: 0,
							transformOrigin: "bottom",
						}}
						animate={{ rotateX: 0, opacity: 1 }}
						exit={{
							rotateX: 90,
							opacity: 0,
							transformOrigin: "top",
						}}
						transition={{ duration: 0.25 }}
						className="w-full h-full grid place-items-center text-5xl font-bold tracking-widest select-none"
					>
						{value}
					</motion.div>
				</AnimatePresence>
			</div>
			<div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
		</div>
		{label && (
			<div className="mt-2 text-xs uppercase tracking-widest text-white/80">
				{label}
			</div>
		)}
	</div>
);

// ---- Confetti helpers (canvas-confetti) ----
function burst() {
	confetti({
		particleCount: 120,
		spread: 80,
		startVelocity: 45,
		origin: { y: 0.6 },
	});
	confetti({
		particleCount: 80,
		spread: 120,
		scalar: 0.9,
		origin: { y: 0.4 },
	});
}
function fireworks() {
	const end = Date.now() + 1200;
	const interval = setInterval(() => {
		const timeLeft = end - Date.now();
		if (timeLeft <= 0) return clearInterval(interval);
		const angle = Math.random() * 60 + 60; // 60 - 120
		confetti({
			particleCount: 40,
			spread: 60,
			angle,
			startVelocity: 60,
			origin: {
				x: Math.random() * 0.6 + 0.2,
				y: Math.random() * 0.3 + 0.2,
			},
		});
	}, 150);
}
function fireConfetti() {
	burst();
	fireworks();
}

// ---- Main ----
export default function CountdownApp() {
	// Tránh hydration mismatch
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	// Mặc định: 22/10/2025 08:00 (UTC+7) -> 01:00 UTC
	const defaultTarget = useMemo(
		() => new Date(Date.UTC(2025, 9, 22, 1, 0, 0)),
		[]
	);
	const [now, setNow] = useState<Date>(new Date());
	const target = defaultTarget;

	const diff = useMemo(() => target.getTime() - now.getTime(), [target, now]);
	const { days, hours, minutes, seconds, millis } = useMemo(
		() => getTimeParts(diff),
		[diff]
	);

	// Nhịp đồng hồ mượt
	useEffect(() => {
		let raf: number;
		let last = performance.now();
		const loop = () => {
			const t = performance.now();
			if (t - last > 100) {
				setNow(new Date());
				last = t;
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, []);

	// Dialog khi tới giờ (không bắn pháo hoa tự động)
	const [dialogOpen, setDialogOpen] = useState(false);
	const openedRef = useRef(false);
	useEffect(() => {
		if (diff <= 0 && !openedRef.current) {
			openedRef.current = true;
			setDialogOpen(true);
		}
	}, [diff]);

	// Nội dung & chọn 1 lần
	type Choice = "dream" | "meeting" | "five" | null;
	const [customMsg, setCustomMsg] = useState<{
		title: string;
		body: string;
	} | null>(null);
	const [selected, setSelected] = useState<Choice>(null);

	// Hiển thị mốc thời gian
	const prettyTarget = useMemo(
		() =>
			new Intl.DateTimeFormat("vi-VN", {
				dateStyle: "full",
				timeStyle: "short",
				timeZone: "Asia/Ho_Chi_Minh",
			}).format(target),
		[target]
	);

	// Click handler: chỉ cho chọn lần đầu
	const onSelect = (choice: Choice) => {
		if (selected) return; // đã chọn rồi, bỏ qua
		setSelected(choice);

		if (choice === "dream") {
			setCustomMsg({
				title: "my dream company ✨",
				body: "Chúc mừng bạn đã tìm được destiny của đời mình!",
			});
			fireConfetti();
		}
		if (choice === "meeting") {
			setCustomMsg({
				title: "Vào phòng họp ngay",
				body: "Bạn đừng có xạo xạo, à bạn vô họp tuyển dụng Job Fair sắp tới ha, manager tương lai!",
			});
			fireConfetti();
		}
		if (choice === "five") {
			setCustomMsg({
				title: "Làm tiếp 5 năm",
				body: "Tôi nghĩ bạn đã đưa ra quyết định đúng đắn.",
			});
			fireConfetti();
		}
	};

	// Style cho nút theo selected
	const baseBtn =
		"px-4 py-2 text-sm font-medium rounded-xl transition shadow border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed";
	const cls = {
		dream: `${baseBtn} ${
			selected === "dream"
				? "bg-amber-400 text-black"
				: "bg-amber-500/90 hover:bg-amber-500"
		}`,
		meeting: `${baseBtn} ${
			selected === "meeting"
				? "bg-emerald-400 text-black"
				: "bg-emerald-500/90 hover:bg-emerald-500"
		}`,
		five: `${baseBtn} ${
			selected === "five"
				? "bg-white text-black"
				: "bg-white/10 hover:bg-white/15"
		}`,
	};

	if (!mounted) return null;

	return (
		<div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(1200px_800px_at_10%_-10%,#66e_30%,transparent),radial-gradient(800px_800px_at_90%_10%,#6ee7b7_20%,transparent),linear-gradient(180deg,#0b1020,#05060f)] text-white">
			{/* Glow orbs */}
			<div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-30 bg-indigo-500" />
			<div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-20 bg-emerald-400" />

			{/* Header */}
			<header className="relative z-10 mx-auto max-w-5xl px-6 pt-10">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
							APP COUNTDOWN ĐỨC HUY
						</h1>
						<p className="text-sm sm:text-base text-white/70 mt-1">
							Time to leave company
						</p>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
				{/* Target card */}
				<div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-5 sm:p-7 shadow-2xl">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="text-white/90">
							<div className="text-xs uppercase tracking-widest text-white/60">
								Đếm ngược tới
							</div>
							<div className="text-lg sm:text-2xl font-semibold mt-1">
								{prettyTarget}
							</div>
						</div>
						<div className="flex items-center gap-2 text-white/70 text-xs">
							<span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
							<span>Đang chạy theo thời gian thực</span>
						</div>
					</div>
				</div>

				{/* Timer */}
				<section className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
					<Digit value={pad(days, 2)} label="Ngày" />
					<Digit value={pad(hours)} label="Giờ" />
					<Digit value={pad(minutes)} label="Phút" />
					<Digit value={pad(seconds)} label="Giây" />
					<Digit
						value={pad(Math.floor(millis / 10))}
						label="Centisecond"
					/>
				</section>

				{/* Progress bar (hiệu ứng vui) */}
				<div className="mt-10">
					<div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
						<motion.div
							className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
							initial={{ width: 0 }}
							animate={{
								width:
									diff <= 0
										? "100%"
										: [
												"0%",
												"80%",
												"60%",
												"90%",
												"70%",
												"100%",
										  ],
							}}
							transition={{
								duration: 3,
								repeat: Infinity,
								repeatType: "reverse",
							}}
						/>
					</div>
				</div>
			</main>

			{/* Dialog */}
			<AnimatePresence>
				{diff <= 0 && (openedRef.current || dialogOpen) && (
					<motion.div
						key="overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-20 grid place-items-center bg-black/40 backdrop-blur-sm"
					>
						<motion.div
							key="panel"
							initial={{ scale: 0.8, rotate: -2 }}
							animate={{ scale: 1, rotate: 0 }}
							exit={{ scale: 0.9, rotate: 1 }}
							transition={{
								type: "spring",
								stiffness: 140,
								damping: 12,
							}}
							className="relative rounded-3xl border border-white/20 bg-gradient-to-br from-indigo-500/40 to-emerald-500/40 p-8 text-center shadow-2xl max-w-lg w-[92%]"
						>
							{/* Close */}
							<button
								onClick={() => setDialogOpen(false)}
								className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:opacity-50"
								aria-label="Close dialog"
								disabled={!!selected} // đã chọn rồi thì không cho đóng
							>
								✕
							</button>

							<motion.div
								initial={{ y: -6, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{
									type: "spring",
									stiffness: 200,
									damping: 18,
									delay: 0.05,
								}}
								className="mx-auto mb-3 inline-flex items-center justify-center text-4xl"
							>
								<span className="mr-2">🛎️</span>
								<span className="mr-2">📣</span>
								<span>😅</span>
							</motion.div>

							{/* Nội dung động */}
							{customMsg ? (
								<>
									<div className="text-2xl font-extrabold leading-snug">
										{customMsg.title}
									</div>
									<div className="mt-2 text-white/85">
										{customMsg.body}
									</div>
								</>
							) : (
								<>
									<div className="text-2xl font-extrabold leading-snug">
										Tới giờ rồi!
									</div>
									<div className="mt-2 text-white/85">
										<span className="font-semibold">
											Sao bạn vẫn còn ngồi đây
										</span>{" "}
										mà chưa vào{" "}
										<span className="font-semibold">
											phòng họp
										</span>{" "}
										vậy? ✨
									</div>
								</>
							)}

							{/* Actions: click 1 lần, highlight nút đã chọn, disable nút kia */}
							<div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
								<button
									onClick={() => onSelect("dream")}
									disabled={
										!!selected && selected !== "dream"
									}
									className={cls.dream}
								>
									Dream Company
								</button>

								<button
									onClick={() => onSelect("meeting")}
									disabled={
										!!selected && selected !== "meeting"
									}
									className={cls.meeting}
								>
									Vào phòng họp ngay
								</button>

								<button
									onClick={() => onSelect("five")}
									disabled={!!selected && selected !== "five"}
									className={cls.five}
								>
									Làm tiếp 5 năm
								</button>
							</div>

							{/* P/s chỉ hiện khi chọn Vào phòng họp ngay */}
							{selected === "meeting" && (
								<div className="mt-4 text-xs text-white/70">
									P/s: Mang theo nụ cười và nước uống nhé 😄
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<style jsx global>{`
				.perspective {
					perspective: 900px;
				}
			`}</style>
		</div>
	);
}
