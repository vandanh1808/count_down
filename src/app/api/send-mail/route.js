// app/api/send-mail/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Bắt buộc dùng Node runtime để xài Nodemailer trên Vercel
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ensureEnv(...keys) {
    for (const k of keys) {
        if (!process.env[k]) throw new Error(`Missing env: ${k}`);
    }
}

function guessContentType(fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "pdf":
            return "application/pdf";
        case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "doc":
            return "application/msword";
        case "csv":
            return "text/csv";
        default:
            return "application/octet-stream";
    }
}

async function fetchPublicFileAsBuffer(origin, fileName) {
    // Encode riêng tên file (có dấu + khoảng trắng) để tránh 404
    const encoded = encodeURIComponent(fileName);
    const url = `${origin}/${encoded}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Fetch failed ${res.status} for ${url}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}


export async function POST(req) {
    try {
        // Simple auth bằng token
        const auth = req.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "");
        if (token !== process.env.CRON_SECRET) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Đọc payload (tùy chọn)
        const payload = await req.json().catch(() => ({}));
        const {
            to = process.env.MAIL_TO,               // fallback người nhận mặc định
            subject = "Đức Huy - Form Đơn Xin Nghỉ Việc",
            text = "Còn chần chờ gì nữa mà không điền vào form này đi thôi!", // fallback nội dung mặc định
        } = payload || {};

        ensureEnv("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM");

        // Tạo transporter SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Xác định origin hiện tại (local: http://localhost:3000, prod: https://*.vercel.app hoặc domain của bạn)
        const origin = req.nextUrl.origin;

        // Tên file đúng như trong /public (có dấu & khoảng trắng)
        const files = [
            "1. Đơn xin nghỉ việc.pdf",
            "1. Đơn xin nghỉ việc.docx",
        ];

        // Tải file public -> Buffer
        const buffers = await Promise.all(
            files.map(async (name) => {
                const content = await fetchPublicFileAsBuffer(origin, name);
                return {
                    filename: name,                // Giữ nguyên tên (Unicode ok)
                    content,
                    contentType: guessContentType(name),
                };
            })
        );

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            text,
            attachments: buffers,
        });

        return NextResponse.json({ ok: true, messageId: info.messageId });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
    }
}
