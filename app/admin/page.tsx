"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, BarChart3, Database, Files, Trash2, RefreshCcw, HardDrive } from "lucide-react";
import Link from "next/link";

interface KnowledgeFile {
    name: string;
    size: number;
    updatedAt: string;
    type: string;
}

interface IndexStats {
    totalRecords: number;
    indexName: string;
    namespaces?: Record<string, unknown>;
}

export default function AdminDashboard() {
    const [files, setFiles] = useState<File[]>([]);
    const [password, setPassword] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [stats, setStats] = useState<IndexStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // New states for Pasted Text
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState("");
    const [sourceLabel, setSourceLabel] = useState("");

    // New states for File Inventory
    const [inventoryFiles, setInventoryFiles] = useState<KnowledgeFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchStats = useCallback(async () => {
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
        } catch (error: unknown) {
            console.error("Failed to fetch stats", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, [password]);

    const fetchInventory = useCallback(async () => {
        if (!password) return;
        setIsLoadingFiles(true);
        try {
            const response = await fetch("/api/admin/files", {
                headers: { "x-admin-password": password }
            });
            if (response.ok) {
                const data = await response.json();
                setInventoryFiles(data.files || []);
            }
        } catch (error: unknown) {
            console.error("Failed to fetch inventory", error);
        } finally {
            setIsLoadingFiles(false);
        }
    }, [password]);

    const handleSync = async () => {
        if (!password) return;
        setIsSyncing(true);
        setStatus(null);
        try {
            const response = await fetch("/api/admin/sync", {
                method: "POST",
                headers: { "x-admin-password": password }
            });
            const data = await response.json();
            if (response.ok) {
                setStatus({ type: 'success', message: data.message });
                fetchStats();
            } else {
                throw new Error(data.error);
            }
        } catch (error: unknown) {
            const err = error as Error;
            setStatus({ type: 'error', message: err.message });
        } finally {
            setIsSyncing(false);
        }
    };

    const deleteFile = async (name: string) => {
        if (!password || !confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            const response = await fetch(`/api/admin/files?name=${encodeURIComponent(name)}`, {
                method: "DELETE",
                headers: { "x-admin-password": password }
            });
            if (response.ok) {
                setStatus({ type: 'success', message: `Deleted ${name}` });
                fetchInventory();
            } else {
                const data = await response.json();
                throw new Error(data.error);
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Delete File API Error:", err);
            setStatus({ type: 'error', message: err.message });
        }
    };

    // Load stats and inventory when password changes or on refresh
    useEffect(() => {
        if (password.length > 5) {
            fetchStats();
            fetchInventory();
        }
    }, [password, fetchStats, fetchInventory]);

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
        if (uploadMode === 'file' && files.length === 0) return;
        if (uploadMode === 'text' && (!pastedText || !sourceLabel)) return;

        setIsUploading(true);
        setStatus(null);
        let successCount = 0;
        let totalChunks = 0;

        try {
            if (uploadMode === 'file') {
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
            } else {
                // handle text upload
                setCurrentlyProcessing(sourceLabel);
                const response = await fetch("/api/admin/upload", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-admin-password": password
                    },
                    body: JSON.stringify({
                        text: pastedText,
                        sourceLabel: sourceLabel
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus({
                        type: 'success',
                        message: `Successfully indexed ${sourceLabel} (${data.chunks} chunks).`
                    });
                    setPastedText("");
                    setSourceLabel("");
                } else {
                    throw new Error(data.error);
                }
            }
            fetchStats();
            fetchInventory();
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

                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('file')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${uploadMode === 'file' ? 'bg-white text-[#128C7E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Upload Files
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('text')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${uploadMode === 'text' ? 'bg-white text-[#128C7E] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Paste Text
                                        </button>
                                    </div>

                                    {uploadMode === 'file' ? (
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
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Source Label</label>
                                                <input
                                                    type="text"
                                                    value={sourceLabel}
                                                    onChange={(e) => setSourceLabel(e.target.value)}
                                                    placeholder="e.g. Diet Protocol Update - Feb 2026"
                                                    className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] focus:ring-2 focus:ring-[#128C7E] focus:outline-none transition-all text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Knowledge Content</label>
                                                <textarea
                                                    value={pastedText}
                                                    onChange={(e) => setPastedText(e.target.value)}
                                                    placeholder="Paste medical insights, research snippets, or notes here..."
                                                    className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] focus:ring-2 focus:ring-[#128C7E] focus:outline-none transition-all text-sm min-h-[200px] resize-y"
                                                />
                                            </div>
                                        </div>
                                    )}

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
                                        disabled={isUploading || (uploadMode === 'file' ? files.length === 0 : !pastedText || !sourceLabel)}
                                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex flex-col items-center justify-center gap-1 ${isUploading || (uploadMode === 'file' ? files.length === 0 : !pastedText || !sourceLabel)
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
                                                    {uploadMode === 'file'
                                                        ? `Upload ${files.length} ${files.length === 1 ? 'File' : 'Files'}`
                                                        : 'Index Pasted Text'}
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

                    {/* Inventory Card */}
                    <div className="md:col-span-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <HardDrive className="w-5 h-5 text-[#128C7E]" />
                                        Knowledge Inventory
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">Files currently on disk in the knowledge base.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={fetchInventory}
                                        className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-[#D1D7DB] transition-all group"
                                        title="Refresh Inventory"
                                    >
                                        <RefreshCcw className={`w-4 h-4 text-slate-500 group-hover:text-[#128C7E] ${isLoadingFiles ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSync}
                                        disabled={isSyncing || !password}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSyncing
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-[#128C7E] text-white hover:bg-[#0b6e63] shadow-md hover:shadow-lg active:scale-95'
                                            }`}
                                    >
                                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                        {isSyncing ? "Syncing..." : "Sync All to Pinecone"}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {isLoadingFiles ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <p className="text-sm font-medium">Scanning knowledge base...</p>
                                    </div>
                                ) : inventoryFiles.length > 0 ? (
                                    <div className="grid gap-3">
                                        {inventoryFiles.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#D1D7DB] hover:border-[#128C7E] hover:bg-slate-50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-[#D1D7DB] flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-[#128C7E]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{file.name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                                                            {file.type} • {(file.size / 1024).toFixed(1)} KB • {new Date(file.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteFile(file.name)}
                                                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg"
                                                    title="Delete File"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                                        <Files className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <h3 className="text-slate-800 font-bold">Knowledge base is empty</h3>
                                        <p className="text-xs text-slate-500 mt-1">Upload files above to start building your AI context.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
