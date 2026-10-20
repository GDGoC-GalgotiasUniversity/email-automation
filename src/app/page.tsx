"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRef, useState } from "react";
import Papa from "papaparse";

type Recipient = { name: string; email: string };

export default function Home() {
  const { data: session, status } = useSession();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [csvError, setCsvError] = useState<string>("");
  const [subject, setSubject] = useState<string>("Hello {{name}}");
  const [body, setBody] = useState<string>(
    "Hi {{name}},\n\nHere is your message.\n\nBest regards"
  );
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [imageName, setImageName] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleCsv(file: File) {
    setCsvError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as any[];
        const parsed: Recipient[] = [];
        for (const row of rows) {
          const nameKey = Object.keys(row).find((k) =>
            k.toLowerCase().includes("name")
          );
          const emailKey = Object.keys(row).find((k) =>
            k.toLowerCase().includes("email")
          );
          const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
          const email = emailKey ? String(row[emailKey] ?? "").trim() : "";
          if (email) parsed.push({ name, email });
        }
        if (!parsed.length) {
          setCsvError(
            "No recipients found. CSV must have 'name' and 'email' columns."
          );
          return;
        }
        setRecipients(parsed);
      },
      error: (err) => setCsvError(err.message),
    });
  }

  function handleImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setImageMimeType(file.type || "image/png");
      setImageName(file.name);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function insertImageTag() {
    const tag = '<img src="cid:emailImage" alt="image" style="max-width:100%;height:auto;" />';
    const ta = textareaRef.current;
    if (!ta) {
      setBody((b) => b + "\n" + tag);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + tag.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleSend() {
    if (!recipients.length) {
      alert("Upload a CSV with recipients first.");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      let htmlBody = body;
      if (imageBase64 && !htmlBody.includes("cid:emailImage")) {
        htmlBody =
          htmlBody +
          "\n<img src=\"cid:emailImage\" alt=\"image\" style=\"max-width:100%;height:auto;\" />";
      }
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          text: body.replace(/<[^>]*>/g, ""),
          html: htmlBody.replace(/\n/g, "<br/>"),
          imageBase64: imageBase64 || undefined,
          imageMimeType: imageMimeType || undefined,
          imageName: imageName || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message ?? String(e) });
    } finally {
      setSending(false);
    }
  }

  if (status === "loading") {
    return <main className="p-8">Loading...</main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-bold">Email Automation</h1>
        <p className="text-gray-600">
          Sign in with Google to send personalized emails with inline images.
        </p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Email Automation</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Upload recipients CSV</h2>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsv(f);
          }}
        />
        {csvError && <p className="text-red-600 text-sm mt-1">{csvError}</p>}
        {recipients.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            Loaded {recipients.length} recipients.
          </p>
        )}
        {recipients.length > 0 && (
          <div className="mt-2 max-h-40 overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 20 && (
              <p className="p-2 text-xs text-gray-500">
                ...and {recipients.length - 20} more
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Compose email</h2>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input
          className="w-full border rounded px-3 py-2 mb-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Use {{name}} for personalization"
        />
        <label className="block text-sm font-medium mb-1">Body</label>
        <textarea
          ref={textareaRef}
          className="w-full border rounded px-3 py-2 h-48 font-mono text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message. Use {{name}}. Insert image with button below."
        />
        <div className="flex items-center gap-3 mt-2">
          <label className="px-3 py-1.5 border rounded cursor-pointer hover:bg-gray-100 text-sm">
            Upload image to embed
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
              }}
            />
          </label>
          {imagePreview && (
            <button
              onClick={insertImageTag}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              Insert image into body
            </button>
          )}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              className="h-12 w-12 object-cover rounded border"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tip: Use {"{{name}}"} and {"{{email}}"} placeholders. Image is
          embedded inline via CID, not as an end attachment.
        </p>
      </section>

      <section className="mb-6">
        <button
          onClick={handleSend}
          disabled={sending || recipients.length === 0}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : `Send to ${recipients.length} recipients`}
        </button>
      </section>

      {result && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Results</h2>
          {result.error && <p className="text-red-600">{result.error}</p>}
          {result.sent !== undefined && (
            <p className="text-green-700">
              Sent: {result.sent} / {recipients.length}
            </p>
          )}
          {result.failed?.length > 0 && (
            <div className="mt-2">
              <p className="text-red-600 font-medium">Failed:</p>
              <ul className="text-sm text-red-600 list-disc pl-5">
                {result.failed.map((f: any, i: number) => (
                  <li key={i}>
                    {f.email}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
