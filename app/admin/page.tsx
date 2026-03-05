"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ArrowLeft, BarChart3, Database, Files, Trash2, RefreshCcw, HardDrive, Users, Ban, UserCheck, Plus } from "lucide-react";
import Link from "next/link";

interface KnowledgeFile {
    name: string;
    size: number;
    updatedAt: string;
    type: string;
}

interface IndexStats {
    totalFiles: number;
    totalKnowledgeNodes: number;
    indexType: string;
    files?: string[];
}

interface ProgressInfo {
    batch: number;
    totalBatches: number;
    chunksIndexed: number;
    totalChunks: number;
    percent: number;
    status?: string;
    startTime?: number;
}

/** Parse a streaming newline-delimited JSON response */
async function parseStreamResponse(
    response: Response,
    onProgress: (data: ProgressInfo) => void,
    onDone: (data: { chunks?: number; totalChunks?: number; message?: string }) => void,
    onError: (error: string) => void
) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const startTime = Date.now();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const event = JSON.parse(line);
                if (event.type === 'progress' || event.type === 'start') {
                    onProgress({ ...event, startTime });
                } else if (event.type === 'done') {
                    onDone(event);
                } else if (event.type === 'error') {
                    onError(event.error);
                } else if (event.type === 'retry') {
                    onProgress({
                        batch: event.batch,
                        totalBatches: event.totalBatches || 0,
                        chunksIndexed: 0,
                        totalChunks: 0,
                        percent: 0,
                        status: `Retrying batch ${event.batch} (attempt ${event.retry})...`,
                        startTime
                    });
                }
            } catch { /* skip invalid JSON */ }
        }
    }
}

export default function AdminDashboard() {
    const [files, setFiles] = useState<File[]>([]);
    const [password, setPassword] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [stats, setStats] = useState<IndexStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [progress, setProgress] = useState<ProgressInfo | null>(null);

    // New states for Pasted Text
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState("");
    const [sourceLabel, setSourceLabel] = useState("");

    // New states for File Inventory
    const [inventoryFiles, setInventoryFiles] = useState<KnowledgeFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // New states for User Management
    const [currentTab, setCurrentTab] = useState<'knowledge' | 'users'>('knowledge');
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isCreatingUser, setIsCreatingUser] = useState(false);

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

    const fetchUsers = useCallback(async () => {
        if (!password) return;
        setIsLoadingUsers(true);
        try {
            const response = await fetch("/api/admin/users", {
                headers: { "x-admin-password": password }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error: unknown) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoadingUsers(false);
        }
    }, [password]);

    const toggleBlockUser = async (userId: string, isBlocked: boolean) => {
        if (!password) return;
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-password": password
                },
                body: JSON.stringify({ id: userId, isBlocked })
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error("Failed to toggle block", error);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!password || !confirm("Delete this user permanently?")) return;
        try {
            const response = await fetch(`/api/admin/users?id=${userId}`, {
                method: "DELETE",
                headers: { "x-admin-password": password }
            });
            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error("Failed to delete user", error);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !newUsername) return;

        setIsCreatingUser(true);
        setStatus(null);
        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-password": password
                },
                body: JSON.stringify({ username: newUsername, mobile: newMobile, password: newPassword })
            });

            if (response.ok) {
                setStatus({ type: 'success', message: `Registered user: ${newUsername}` });
                setNewUsername("");
                setNewMobile("");
                setNewPassword("");
                fetchUsers();
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to register user");
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const syncSingleFile = async (name: string) => {
        if (!password) {
            setStatus({ type: 'error', message: "Please enter Admin Password first" });
            return;
        }
        setIsSyncing(true);
        setStatus(null);
        setProgress(null);
        setCurrentlyProcessing(`🔄 Syncing ${name}...`);

        try {
            const response = await fetch("/api/admin/sync", {
                method: "POST",
                headers: {
                    "x-admin-password": password,
                    "x-sync-file": name
                }
            });

            if (response.status === 401) {
                throw new Error("Invalid Admin Password");
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Sync failed");
            }

            await parseStreamResponse(
                response,
                (p) => setProgress(p),
                (data) => {
                    setStatus({ type: 'success', message: `Successfully synced ${name}` });
                    setProgress(null);
                    fetchStats();
                },
                (error) => {
                    setStatus({ type: 'error', message: error });
                    setProgress(null);
                }
            );
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSyncing(false);
            setCurrentlyProcessing(null);
        }
    };

    const handleSync = async () => {
        if (!password) return;
        setIsSyncing(true);
        setStatus(null);
        setProgress(null);
        try {
            const response = await fetch("/api/admin/sync", {
                method: "POST",
                headers: { "x-admin-password": password }
            });

            if (response.status === 401) {
                throw new Error("Invalid Admin Password");
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }

            await parseStreamResponse(
                response,
                (p) => setProgress(p),
                (data) => {
                    setStatus({ type: 'success', message: data.message || 'Sync complete!' });
                    setProgress(null);
                    fetchStats();
                },
                (error) => {
                    setStatus({ type: 'error', message: error });
                    setProgress(null);
                }
            );
        } catch (error: unknown) {
            const err = error as Error;
            setStatus({ type: 'error', message: err.message });
            setProgress(null);
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
            fetchUsers();
        }
    }, [password, fetchStats, fetchInventory, fetchUsers]);

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
        setProgress(null);
        let successCount = 0;
        let totalChunks = 0;

        // Yield to let the browser paint the loading state before heavy processing
        await new Promise(r => setTimeout(r, 50));

        try {
            if (uploadMode === 'file') {
                for (const file of files) {
                    if (file.size > 4 * 1024 * 1024) {
                        setStatus({ type: 'error', message: `Skipped ${file.name}: File too large (Max 4MB).` });
                        continue;
                    }

                    try {
                        let uploadFile: File | Blob = file;
                        let uploadName = file.name;

                        setCurrentlyProcessing(`⬆️ Indexing ${uploadName}...`);
                        const formData = new FormData();
                        formData.append("file", uploadFile, uploadName);

                        const response = await fetch("/api/admin/upload", {
                            method: "POST",
                            body: formData,
                            headers: { "x-admin-password": password }
                        });

                        if (!response.ok && !response.body) {
                            const data = await response.json();
                            throw new Error(data.error || response.statusText);
                        }

                        // Parse streaming progress
                        await parseStreamResponse(
                            response,
                            (p) => setProgress(p),
                            (data) => {
                                successCount++;
                                totalChunks += data.chunks || 0;
                                setProgress(null);
                            },
                            (error) => {
                                setStatus({ type: 'error', message: `${file.name}: ${error}` });
                                setProgress(null);
                            }
                        );
                    } catch (err) {
                        console.error(`Upload error for ${file.name}:`, err);
                        setStatus({ type: 'error', message: err instanceof Error ? err.message : `Failed to upload ${file.name}` });
                    }
                }
                if (successCount > 0) {
                    setStatus({ type: 'success', message: `Processed ${successCount}/${files.length} files. ${totalChunks} chunks indexed.` });
                } else if (files.length > 0) {
                    setStatus(prev => prev || { type: 'error', message: "All uploads failed." });
                }
                setFiles([]);
            } else {
                setCurrentlyProcessing(sourceLabel);
                const response = await fetch("/api/admin/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-admin-password": password },
                    body: JSON.stringify({ text: pastedText, sourceLabel })
                });

                await parseStreamResponse(
                    response,
                    (p) => setProgress(p),
                    (data) => {
                        setStatus({ type: 'success', message: data.message || `Indexed ${sourceLabel}` });
                        setProgress(null);
                        setPastedText("");
                        setSourceLabel("");
                    },
                    (error) => {
                        setStatus({ type: 'error', message: error });
                        setProgress(null);
                    }
                );
            }
            fetchStats();
            fetchInventory();
        } catch (error) {
            setStatus({ type: 'error', message: error instanceof Error ? error.message : "An unexpected error occurred" });
        } finally {
            setIsUploading(false);
            setCurrentlyProcessing(null);
            setProgress(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#128C7E] transition-colors mb-2 py-2 px-1 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Chat
                </Link>

                <div className="flex bg-white/50 p-1 rounded-2xl w-fit shadow-sm mb-6 overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setCurrentTab('knowledge')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${currentTab === 'knowledge' ? 'bg-[#128C7E] text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}
                    >
                        <Database className="w-4 h-4" />
                        Knowledge Base
                    </button>
                    <button
                        onClick={() => setCurrentTab('users')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${currentTab === 'users' ? 'bg-[#128C7E] text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}
                    >
                        <Users className="w-4 h-4" />
                        User Management
                    </button>
                </div>

                {currentTab === 'knowledge' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Stats & Tips */}
                            <div className="md:col-span-1 space-y-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] p-6">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <BarChart3 className="w-5 h-5 text-[#128C7E]" />
                                        Index Status
                                    </h2>

                                    {stats ? (
                                        <div className="space-y-4">
                                            <div className="bg-[#f0f9f6] p-4 rounded-xl border border-[#d1e7dd]">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Knowledge Nodes</p>
                                                <p className="text-3xl font-black text-[#128C7E]">{stats.totalKnowledgeNodes}</p>
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                <div className="flex justify-between py-1 border-b border-slate-100">
                                                    <span>Files Indexed:</span>
                                                    <span className="font-bold">{stats.totalFiles}</span>
                                                </div>
                                                <div className="flex justify-between py-1">
                                                    <span>Architecture:</span>
                                                    <span className="text-[#128C7E] font-medium">{stats.indexType}</span>
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
                                            <p>Documents are parsed into a <strong>hierarchical tree structure</strong>.</p>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                <span className="text-blue-600 font-bold">2</span>
                                            </div>
                                            <p>Uses <strong>Gemini Reasoning</strong> to navigate sections and summaries.</p>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                <span className="text-blue-600 font-bold">3</span>
                                            </div>
                                            <p>Zero-vector storage means <strong>perfect context retrieval</strong>.</p>
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
                                            AI Brain Training Center
                                        </h1>
                                        <p className="text-teal-50/80 mt-2">
                                            Upload clinical papers, PDF guidelines, or medical text to expand the AI's specialized knowledge.
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
                                                        accept=".pdf,.docx,.txt,.md,.json"
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
                                                            <p className="text-slate-700 font-semibold text-lg">
                                                                Drop PDFs here to Teach the AI
                                                            </p>
                                                            <p className="text-slate-500 text-sm mt-1">
                                                                PDF, DOCX, TXT (Maximum 4MB per file)
                                                            </p>
                                                            <p className="text-xs text-emerald-600 mt-2 font-medium bg-emerald-50 py-1 px-3 rounded-full inline-block">
                                                                ⚡ Gemini automatically builds a multi-step reasoning tree for this data
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

                                            {/* Progress Bar */}
                                            {progress && (isUploading || isSyncing) && (
                                                <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                    {/* Progress Bar */}
                                                    <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500 ease-out"
                                                            style={{
                                                                width: `${progress.percent || 0}%`,
                                                                background: 'linear-gradient(90deg, #128C7E, #25D366)',
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-slate-700 drop-shadow-sm">
                                                                {progress.percent || 0}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                                                        <span>
                                                            Batch {progress.batch}/{progress.totalBatches}
                                                        </span>
                                                        <span>
                                                            {progress.chunksIndexed}/{progress.totalChunks} chunks
                                                        </span>
                                                        {progress.startTime && progress.percent > 0 && (
                                                            <span>
                                                                ~{Math.max(1, Math.round(
                                                                    ((Date.now() - progress.startTime) / progress.percent) * (100 - progress.percent) / 1000
                                                                ))}s left
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Status message */}
                                                    {progress.status && (
                                                        <p className="text-[10px] text-amber-600 mt-1 animate-pulse">
                                                            {progress.status}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inventory Card */}
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
                                        {isSyncing ? "Syncing..." : "Re-Index All Knowledge"}
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
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => syncSingleFile(file.name)}
                                                        disabled={isSyncing || !password}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-100 disabled:opacity-30 disabled:grayscale"
                                                        title="Load this file into the AI"
                                                    >
                                                        {isSyncing && currentlyProcessing?.includes(file.name) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                                                        Index File
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteFile(file.name)}
                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                        title="Delete from disk"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Files className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-slate-800 font-bold text-lg">No Verified Knowledge Found</h3>
                                        <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto">
                                            {password.length < 5
                                                ? "Please enter your Security Password above to unlock and manage the clinical database."
                                                : "Start by dropping a PDF in the uploader to train your specialized medical assistant."
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Tree Visualization (New) */}
                            {currentlyProcessing?.includes('PageIndex') && (
                                <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] p-8 animate-in fade-in slide-in-from-bottom-4">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <Files className="w-5 h-5 text-[#128C7E]" />
                                        PageIndex Reasoning Tree
                                    </h2>
                                    <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
                                        <pre>
                                            {currentlyProcessing.includes('done') ? 'Tree Generated Successfully.' : 'Tracing document hierarchy...'}
                                            {'\n'}
                                            {`[Root] Kidney AI Guidelines\n ├── [Section] Introduction\n │    ├── Summary: Overview of CKD...\n │    └── [Pages] 1-2\n ├── [Section] Diagnosis\n │    ├── [Sub] Lab Tests\n │    └── [Pages] 3-8\n └── [Section] Treatment\n      ├── [Sub] Dialysis\n      └── [Pages] 9-20`}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* User Management View */
                    <div className="bg-white rounded-2xl shadow-sm border border-[#D1D7DB] overflow-hidden animate-in fade-in duration-500">
                        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                                    <Users className="w-7 h-7 text-[#128C7E]" />
                                    User Management
                                </h1>
                                <p className="text-slate-500 mt-1">Add new accounts, view query logs, and manage access.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Admin Password"
                                    className="px-4 py-2.5 rounded-xl border border-[#D1D7DB] text-sm focus:ring-2 focus:ring-[#128C7E] outline-none transition-all w-full md:w-64"
                                />
                                <button
                                    onClick={fetchUsers}
                                    className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-[#D1D7DB] shadow-sm transition-all shrink-0"
                                    title="Refresh Users"
                                >
                                    <RefreshCcw className={`w-5 h-5 text-slate-600 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* New User Form Card */}
                        <div className="p-8 bg-white border-b border-slate-100">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-[#128C7E]" />
                                Add New Authorized User
                            </h2>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dr. Sachin"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] text-sm focus:ring-2 focus:ring-[#128C7E] outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Mobile Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. +91 9876543210"
                                        value={newMobile}
                                        onChange={(e) => setNewMobile(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] text-sm focus:ring-2 focus:ring-[#128C7E] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">Initial Password (Optional)</label>
                                    <input
                                        type="password"
                                        placeholder="e.g. securepass123"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-[#D1D7DB] text-sm focus:ring-2 focus:ring-[#128C7E] outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreatingUser || !newUsername || !password}
                                    className="h-[52px] bg-[#128C7E] hover:bg-[#0b6e63] text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {isCreatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Register Account
                                </button>
                            </form>
                            {status && status.message.includes('Registered') && (
                                <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    {status.message}
                                </div>
                            )}
                        </div>

                        <div className="p-0">
                            {users.length > 0 ? (
                                <>
                                    {/* Desktop Table */}
                                    <table className="w-full text-left hidden md:table">
                                        <thead>
                                            <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100">
                                                <th className="px-8 py-4">Username</th>
                                                <th className="px-8 py-4">Contact</th>
                                                <th className="px-8 py-4">Queries (Today)</th>
                                                <th className="px-8 py-4">Total Queries</th>
                                                <th className="px-8 py-4">Last Active</th>
                                                <th className="px-8 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {users.map((u) => (
                                                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.isBlocked ? 'bg-red-50/30 opacity-70' : ''}`}>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${u.isBlocked ? 'bg-slate-400' : 'bg-[#128C7E]'}`}>
                                                                {u.username[0].toUpperCase()}
                                                            </div>
                                                            <span className="font-bold text-slate-700">{u.username}</span>
                                                            {u.isBlocked && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Blocked</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-slate-600 font-medium">{u.mobile || "—"}</span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`font-mono font-bold ${u.dailyQueries >= 45 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {u.dailyQueries}
                                                        </span>
                                                        <span className="text-slate-300 text-[10px] ml-1">/ 50</span>
                                                    </td>
                                                    <td className="px-8 py-5 font-mono text-slate-600 font-medium">
                                                        {u.totalQueries}
                                                    </td>
                                                    <td className="px-8 py-5 text-xs text-slate-500">
                                                        {new Date(u.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => toggleBlockUser(u.id, !u.isBlocked)}
                                                                className={`p-2 rounded-lg transition-all border ${u.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                                                title={u.isBlocked ? "Unblock User" : "Block User"}
                                                            >
                                                                {u.isBlocked ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden divide-y divide-slate-100">
                                        {users.map((u) => (
                                            <div key={u.id} className={`p-4 ${u.isBlocked ? 'bg-red-50/30' : ''}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg ${u.isBlocked ? 'bg-slate-400' : 'bg-[#128C7E]'}`}>
                                                            {u.username[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-800">{u.username}</span>
                                                                {u.isBlocked && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Blocked</span>}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <p className="text-[11px] text-[#128C7E] font-bold">{u.mobile || "No Mobile"}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                                                    Last: {new Date(u.lastActive).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleBlockUser(u.id, !u.isBlocked)}
                                                            className={`p-2.5 rounded-xl transition-all border ${u.isBlocked ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                                        >
                                                            {u.isBlocked ? <UserCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Today</p>
                                                        <p className={`text-sm font-mono font-bold ${u.dailyQueries >= 45 ? 'text-red-600' : 'text-[#128C7E]'}`}>
                                                            {u.dailyQueries} / 50
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Total</p>
                                                        <p className="text-sm font-mono font-bold text-slate-700">
                                                            {u.totalQueries}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="p-20 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <Users className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-slate-800 font-bold text-lg">No Users Registered</h3>
                                    <p className="text-sm text-slate-500 mt-2">When people start using the chatbot, their activity will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
