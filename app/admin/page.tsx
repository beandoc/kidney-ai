"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus(null);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsUploading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
                headers: {
                    "x-admin-password": password
                }
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({
                    type: 'success',
                    message: `Success! Indexed ${data.chunks} chunks from "${file.name}".`
                });
                setFile(null);
                // Reset file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : "An unexpected error occurred"
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-8 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Chat
                </Link>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <FileText className="w-7 h-7" />
                            Knowledge Base Admin
                        </h1>
                        <p className="text-blue-100 mt-2">
                            Upload medical reports, guidelines, or research to train your AI.
                        </p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Admin Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your security password"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors group">
                                <input
                                    type="file"
                                    id="file-upload"
                                    onChange={handleFileChange}
                                    accept=".pdf,.docx,.txt,.md"
                                    className="hidden"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center gap-3"
                                >
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-700 font-semibold">
                                            {file ? file.name : "Click to select a file"}
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Supports PDF, DOCX, TXT, and MD (Max 10MB)
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                    {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    <span className="text-sm font-medium">{status.message}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!file || isUploading}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${!file || isUploading
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing & Indexing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload to Knowledge Base
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-100">
                            <h3 className="text-slate-800 font-bold mb-4 uppercase text-xs tracking-widest">
                                Processing Details
                            </h3>
                            <ul className="space-y-3 text-sm text-slate-500">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    Files are automatically split into 1000-character chunks with overlap.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    Embeddings are generated using Gemini Text-004.
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    Data is stored permanently in your Pinecone index.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
