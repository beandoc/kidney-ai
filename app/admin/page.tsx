"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, BarChart3, Database, Files, Trash2 } from "lucide-react";
import Link from "next/link";

interface IndexStats {
    totalRecords: number;
    indexName: string;
    namespaces?: any;
}

export default function AdminDashboard() {
    const [files, setFiles] = useState<File[]>([]);
    const [password, setPassword] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [stats, setStats] = useState<IndexStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const fetchStats = async () => {
        if (!password) return;
        setIsLoadingStats(true);
        try {
            const response = await fetch("/api/admin/stats", {
                headers: { "x-admin-password": password }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
            setStatus(null);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) return;

        setIsUploading(true);
        setStatus(null);
        let successCount = 0;
        let totalChunks = 0;

        try {
            for (const file of files) {
                setCurrentlyProcessing(file.name);
                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                    headers: {
                        "x-admin-password": password
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    successCount++;
                    totalChunks += data.chunks;
                } else {
                    throw new Error(`Failed to upload ${file.name}: ${data.error}`);
                }
            }

            setStatus({
                type: 'success',
                message: `Bulk success! Processed ${successCount} files and generated ${totalChunks} high-precision chunks.`
            });
            setFiles([]);
            fetchStats();
        } catch (error) {
            setStatus({
                type: 'error',
                message: error instanceof Error ? error.message : "An unexpected error occurred"
            });
        } finally {
            setIsUploading(false);
            setCurrentlyProcessing(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#128C7E] transition-colors mb-2 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Chat
                </Link>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Stats Card */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] p-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-[#128C7E]" />
                                Index Status
                            </h2>

                            {stats ? (
                                <div className="space-y-4">
                                    <div className="bg-[#f0f9f6] p-4 rounded-xl border border-[#d1e7dd]">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Chunks</p>
                                        <p className="text-3xl font-black text-[#128C7E]">{stats.totalRecords}</p>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        <div className="flex justify-between py-1 border-b border-slate-100">
                                            <span>Index:</span>
                                            <span className="font-mono">{stats.indexName}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>Format:</span>
                                            <span className="text-[#128C7E] font-medium">Sentence-Level</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Database className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">Login to see stats</p>
                                    <button
                                        onClick={fetchStats}
                                        disabled={!password || isLoadingStats}
                                        className="mt-4 text-xs text-[#128C7E] font-bold hover:underline disabled:text-slate-300"
                                    >
                                        {isLoadingStats ? "Loading..." : "Refresh Stats"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] p-6">
                            <h3 className="text-slate-800 font-bold mb-4 uppercase text-xs tracking-widest">
                                Processing Guide
                            </h3>
                            <ul className="space-y-4 text-xs text-slate-500">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <span className="text-blue-600 font-bold">1</span>
                                    </div>
                                    <p>Files are split into <strong>500-char chunks</strong> for high accuracy.</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <span className="text-blue-600 font-bold">2</span>
                                    </div>
                                    <p>Embeddings use <strong>Gemini Text-004</strong> (3072 dimensions).</p>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <span className="text-blue-600 font-bold">3</span>
                                    </div>
                                    <p>Stored in <strong>Pinecone Serverless</strong> for blazing search.</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Upload Card */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] overflow-hidden">
                            <div className="bg-[#128C7E] p-8 text-white">
                                <h1 className="text-2xl font-bold flex items-center gap-3">
                                    <Files className="w-7 h-7" />
                                    Bulk Knowledge Uploader
                                </h1>
                                <p className="text-teal-50/80 mt-2">
                                    Expand your medical knowledge base by uploading multiple professional resources.
                                </p>
                            </div>

                            <div className="p-8">
                                <form onSubmit={handleUpload} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Admin Security Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onBlur={fetchStats}
                                            placeholder="Enter your security password"
                                            className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] focus:ring-2 focus:ring-[#128C7E] focus:outline-none transition-all pr-12"
                                            required
                                        />
                                    </div>

                                    <div className="border-2 border-dashed border-[#D1D7DB] rounded-xl p-8 text-center hover:border-[#128C7E] transition-colors group relative bg-[#F8F9FA]">
                                        <input
                                            type="file"
                                            id="file-upload"
                                            multiple
                                            onChange={handleFileChange}
                                            accept=".pdf,.docx,.txt,.md"
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer flex flex-col items-center gap-3"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-[#D1D7DB] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-[#128C7E]" />
                                            </div>
                                            <div>
                                                <p className="text-slate-700 font-semibold">
                                                    Click to Select Multiple Files
                                                </p>
                                                <p className="text-slate-500 text-sm mt-1">
                                                    PDF, DOCX, TXT, MD up to 10MB each
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Selected Files List */}
                                    {files.length > 0 && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Selected Files ({files.length})</p>
                                            {files.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-[#F0F2F5] rounded-xl border border-[#D1D7DB]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <FileText className="w-4 h-4 text-[#128C7E]" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px] md:max-w-xs">{f.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(i)}
                                                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {status && (
                                        <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                            }`}>
                                            {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                            <span className="text-sm font-medium">{status.message}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={files.length === 0 || isUploading}
                                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex flex-col items-center justify-center gap-1 ${files.length === 0 || isUploading
                                            ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                            : 'bg-[#128C7E] hover:bg-[#0b6e63] active:scale-[0.98]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Indexing in Progress...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5" />
                                                    Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                                                </>
                                            )}
                                        </div>
                                        {currentlyProcessing && (
                                            <p className="text-[10px] text-teal-100 uppercase tracking-widest font-normal animate-pulse">
                                                Active: {currentlyProcessing}
                                            </p>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
