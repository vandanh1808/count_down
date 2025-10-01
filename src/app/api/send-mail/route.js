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
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
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
            to = process.env.MAIL_TO, // fallback người nhận mặc định
            subject = "Đức Huy - Form Đơn Xin Nghỉ Việc",
            text: textOverride,       // nếu body có 'text' thì override
        } = payload || {};

        ensureEnv("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM");

        // Tạo transporter SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465, // 465 = SSL
            auth: {
                user: process.env.SMPP_USER || process.env.SMTP_USER, // lỡ tay gõ nhầm key cũng không sao :)
                pass: process.env.SMTP_PASS,
            },
        });

        // Xác định origin hiện tại (vd: https://count-down-pi-peach.vercel.app)
        const origin = req.nextUrl.origin;
        // Trang chủ đếm ngược (thêm dấu '/')
        const homepageUrl = `${origin}/`;

        // Nội dung text mặc định (có chèn link plain text)
        const fallbackText =
            "Còn chần chờ gì nữa mà không điền vào form này đi thôi!\n" +
            `Trang đếm ngược: ${homepageUrl}`;

        // Nội dung HTML đẹp (có anchor)
        const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#222">
        <h2 style="margin:0 0 8px">Đức Huy - Form Đơn Xin Nghỉ Việc</h2>
        <p style="margin:0 0 12px">Còn chần chờ gì nữa mà không điền vào form này đi thôi!</p>
        <p style="margin:0 0 12px">
          👉 Xem trang đếm ngược tại:
          <a href="${homepageUrl}" target="_blank" style="color:#2563eb;text-decoration:none">
            ${homepageUrl}
          </a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p style="font-size:12px;color:#6b7280;margin:0">Email tự động từ hệ thống countdown.</p>
      </div>
    `;

        // Tên file đúng như trong /public (có dấu & khoảng trắng)
        const files = ["1. Đơn xin nghỉ việc.pdf", "1. Đơn xin nghỉ việc.docx"];

        // Tải file public -> Buffer
        const attachments = await Promise.all(
            files.map(async (name) => {
                const content = await fetchPublicFileAsBuffer(origin, name);
                return {
                    filename: name, // Giữ nguyên tên (Unicode ok)
                    content,
                    contentType: guessContentType(name),
                };
            })
        );

        // Gửi mail
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            text: textOverride || fallbackText, // text thuần (phòng khi client không render HTML)
            html,                               // nội dung HTML có link
            attachments,
        });

        return NextResponse.json({ ok: true, messageId: info.messageId });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
    }
}
