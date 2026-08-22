import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';
import {
    X,
    Share2,
    Users,
    Link,
    Lock,
    Globe,
    UserCheck,
    UserPlus,
    Trash2,
    Copy,
    Check,
    RefreshCw,
    Shield,
    Clock,
    Eye,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Search,
    ShieldAlert
} from 'lucide-react';

const FormShareModal = ({ isOpen, onClose, form, roomId, onUpdateForm }) => {
    const [activeTab, setActiveTab] = useState('sharing'); // 'sharing', 'collaborators', 'students'
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [copied, setCopied] = useState(false);

    // Sharing Settings
    const [sharingEnabled, setSharingEnabled] = useState(form?.sharingEnabled !== false);
    const [sharingMode, setSharingMode] = useState(form?.sharingMode || 'classroom');
    const [shareToken, setShareToken] = useState(form?.shareToken || '');
    const [shareExpiresAt, setShareExpiresAt] = useState(form?.shareTokenExpiresAt || null);
    const [requireAuth, setRequireAuth] = useState(form?.requireAuthentication !== false);
    const [allowExternal, setAllowExternal] = useState(!!form?.allowExternalAccess);
    const [expiryHours, setExpiryHours] = useState('24');

    // Collaborators
    const [collaborators, setCollaborators] = useState([]);
    const [owner, setOwner] = useState(null);
    const [newCollabEmail, setNewCollabEmail] = useState('');
    const [newCollabRole, setNewCollabRole] = useState('viewer');
    const [addingCollab, setAddingCollab] = useState(false);

    // Selected Students Access
    const [accessList, setAccessList] = useState([]);
    const [classroomStudents, setClassroomStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState('');

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (isOpen && form?._id) {
            setSharingEnabled(form.sharingEnabled !== false);
            setSharingMode(form.sharingMode || 'classroom');
            setShareToken(form.shareToken || '');
            setShareExpiresAt(form.shareTokenExpiresAt || null);
            setRequireAuth(form.requireAuthentication !== false);
            setAllowExternal(!!form.allowExternalAccess);
            loadCollaborators();
            loadAccessList();
            loadClassroomMembers();
        }
    }, [isOpen, form]);

    const loadCollaborators = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/collaborators`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setCollaborators(data.collaborators || []);
                setOwner(data.owner || null);
            }
        } catch (e) {
            console.error("Failed to load collaborators", e);
        }
    };

    const loadAccessList = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/access`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setAccessList(data.accessList || []);
            }
        } catch (e) {
            console.error("Failed to load access list", e);
        }
    };

    const loadClassroomMembers = async () => {
        try {
            if (!roomId) return;
            const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.room?.members) {
                setClassroomStudents(data.room.members.filter(m => m.role === 'student'));
            }
        } catch (e) {
            console.error("Failed to load room members", e);
        }
    };

    const handleSaveSharingSettings = async (mode = sharingMode, enabled = sharingEnabled) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/sharing`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    sharingEnabled: enabled,
                    sharingMode: mode,
                    requireAuthentication: requireAuth,
                    allowExternalAccess: allowExternal
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Sharing settings updated.");
                if (onUpdateForm) onUpdateForm(data.form);
            } else {
                showToast(data.message || "Failed to update sharing settings", "error");
            }
        } catch (e) {
            showToast("Error updating sharing settings", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateShareLink = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/share-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    expiresInHours: expiryHours === 'never' ? null : Number(expiryHours),
                    requireAuthentication: requireAuth,
                    allowExternalAccess: allowExternal
                })
            });
            const data = await res.json();
            if (data.success) {
                setShareToken(data.shareToken);
                setShareExpiresAt(data.shareTokenExpiresAt);
                setSharingMode('link');
                showToast("Share link generated!");
                if (onUpdateForm) onUpdateForm({ ...form, shareToken: data.shareToken, sharingMode: 'link' });
            } else {
                showToast(data.message || "Failed to generate share link", "error");
            }
        } catch (e) {
            showToast("Error generating share link", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeShareLink = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/revoke-share-link`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setShareToken('');
                setShareExpiresAt(null);
                setSharingMode('classroom');
                showToast("Share link revoked.");
                if (onUpdateForm) onUpdateForm({ ...form, shareToken: null, sharingMode: 'classroom' });
            }
        } catch (e) {
            showToast("Error revoking share link", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyShareLink = () => {
        if (!shareToken) return;
        const url = `${window.location.origin}/forms/shared/${shareToken}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        showToast("Share link copied to clipboard!");
    };

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!newCollabEmail.trim()) return;
        setAddingCollab(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/collaborators`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: newCollabEmail.trim(),
                    role: newCollabRole
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewCollabEmail('');
                showToast("Collaborator added successfully!");
                loadCollaborators();
            } else {
                showToast(data.message || "Failed to add collaborator", "error");
            }
        } catch (e) {
            showToast("Error adding collaborator", "error");
        } finally {
            setAddingCollab(false);
        }
    };

    const handleUpdateCollabRole = async (collaboratorId, role) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/collaborators/${collaboratorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Role updated.");
                loadCollaborators();
            }
        } catch (e) {
            showToast("Failed to update role", "error");
        }
    };

    const handleRemoveCollaborator = async (collaboratorId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forms/${form._id}/collaborators/${collaboratorId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                showToast("Collaborator removed.");
                loadCollaborators();
            }
        } catch (e) {
            showToast("Failed to remove collaborator", "error");
        }
    };

    const handleToggleStudentAccess = async (studentId, isCurrentlyGranted) => {
        try {
            if (isCurrentlyGranted) {
                await fetch(`${API_BASE_URL}/api/forms/${form._id}/access/${studentId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                showToast("Student access revoked.");
            } else {
                await fetch(`${API_BASE_URL}/api/forms/${form._id}/access`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ userIds: [studentId] })
                });
                showToast("Student access granted.");
            }
            loadAccessList();
        } catch (e) {
            showToast("Failed to toggle student access", "error");
        }
    };

    if (!isOpen) return null;

    const grantedUserIds = new Set(accessList.map(a => a.userId?._id || a.userId));
    const filteredStudents = classroomStudents.filter(s =>
        s.fullname?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181a20] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#1e2029]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Share & Access Control</h2>
                            <p className="text-xs text-gray-400">Manage permissions, links, and collaborators for "{form?.title}"</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 px-5 pt-3 border-b border-gray-800 bg-[#181a20]">
                    <button
                        onClick={() => setActiveTab('sharing')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                            activeTab === 'sharing'
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <Globe className="w-4 h-4" />
                        Access & Links
                    </button>
                    <button
                        onClick={() => setActiveTab('collaborators')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                            activeTab === 'collaborators'
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        Collaborators ({collaborators.length})
                    </button>
                    {sharingMode === 'selected_users' && (
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                                activeTab === 'students'
                                    ? 'border-purple-500 text-purple-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <UserCheck className="w-4 h-4" />
                            Selected Students ({accessList.length})
                        </button>
                    )}
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                        toast.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    }`}>
                        {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {toast.message}
                    </div>
                )}

                {/* Content Area */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6">

                    {/* TAB 1: SHARING & ACCESS */}
                    {activeTab === 'sharing' && (
                        <div className="space-y-6">
                            {/* Enable Sharing Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                                <div>
                                    <div className="font-medium text-sm text-white">Form Sharing</div>
                                    <div className="text-xs text-gray-400 mt-0.5">Control whether respondents can access this form</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sharingEnabled}
                                        onChange={(e) => {
                                            setSharingEnabled(e.target.checked);
                                            handleSaveSharingSettings(sharingMode, e.target.checked);
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {/* Sharing Mode Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Sharing Mode</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { id: 'classroom', title: 'Classroom Members', desc: 'All enrolled students can access', icon: Users },
                                        { id: 'selected_users', title: 'Selected Students', desc: 'Only explicitly granted students', icon: UserCheck },
                                        { id: 'link', title: 'Secure Link', desc: 'Anyone with cryptographic link', icon: Link },
                                        { id: 'restricted', title: 'Restricted', desc: 'Owner and collaborators only', icon: Lock }
                                    ].map(mode => {
                                        const Icon = mode.icon;
                                        const isSelected = sharingMode === mode.id;
                                        return (
                                            <div
                                                key={mode.id}
                                                onClick={() => {
                                                    setSharingMode(mode.id);
                                                    handleSaveSharingSettings(mode.id, sharingEnabled);
                                                }}
                                                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-purple-600/10 border-purple-500/50 shadow-sm shadow-purple-500/10'
                                                        : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 mb-1">
                                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                                                    <div className={`text-xs font-semibold ${isSelected ? 'text-purple-300' : 'text-gray-200'}`}>
                                                        {mode.title}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-gray-400">{mode.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Link Sharing Generator */}
                            {sharingMode === 'link' && (
                                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/30 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Link className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs font-semibold text-purple-200">Cryptographic Share Link</span>
                                        </div>
                                        {shareExpiresAt && (
                                            <span className="text-[10px] text-purple-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Expires: {new Date(shareExpiresAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {shareToken ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={`${window.location.origin}/forms/shared/${shareToken}`}
                                                    className="flex-1 px-3 py-2 text-xs bg-black/40 border border-gray-700 rounded-xl text-gray-300 font-mono select-all focus:outline-none"
                                                />
                                                <button
                                                    onClick={handleCopyShareLink}
                                                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/20"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copied ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={handleGenerateShareLink}
                                                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <RefreshCw className="w-3 h-3" /> Regenerate Link
                                                </button>
                                                <span className="text-gray-700">•</span>
                                                <button
                                                    onClick={handleRevokeShareLink}
                                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Revoke Link
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs text-gray-400">Link Expiry:</label>
                                                <select
                                                    value={expiryHours}
                                                    onChange={(e) => setExpiryHours(e.target.value)}
                                                    className="px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                                                >
                                                    <option value="1">1 Hour</option>
                                                    <option value="24">24 Hours (1 Day)</option>
                                                    <option value="168">7 Days</option>
                                                    <option value="720">30 Days</option>
                                                    <option value="never">No Expiration</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleGenerateShareLink}
                                                disabled={loading}
                                                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Generate Secure Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: COLLABORATORS */}
                    {activeTab === 'collaborators' && (
                        <div className="space-y-5">
                            {/* Add Collaborator Form */}
                            <form onSubmit={handleAddCollaborator} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                                    Add Teacher / Collaborator
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="email"
                                        required
                                        placeholder="Enter colleague's email..."
                                        value={newCollabEmail}
                                        onChange={(e) => setNewCollabEmail(e.target.value)}
                                        className="flex-1 px-3 py-2 text-xs bg-black/40 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                    <select
                                        value={newCollabRole}
                                        onChange={(e) => setNewCollabRole(e.target.value)}
                                        className="px-3 py-2 text-xs bg-gray-900 border border-gray-700 rounded-xl text-gray-200"
                                    >
                                        <option value="editor">Editor (Can edit structure & grade)</option>
                                        <option value="reviewer">Reviewer (Can grade & view responses)</option>
                                        <option value="viewer">Viewer (Read-only)</option>
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={addingCollab || !newCollabEmail.trim()}
                                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </div>
                            </form>

                            {/* Collaborator List */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">People with Access</label>
                                
                                {/* Owner Row */}
                                {owner && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/30 border border-gray-800/80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 font-semibold text-xs flex items-center justify-center border border-purple-500/30">
                                                {owner.fullname?.[0]?.toUpperCase() || 'O'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-white flex items-center gap-1.5">
                                                    {owner.fullname}
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        Owner
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-400">{owner.email}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500">Root Control</span>
                                    </div>
                                )}

                                {/* Collaborator Rows */}
                                {collaborators.map(c => (
                                    <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/30 border border-gray-800 hover:border-gray-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 font-semibold text-xs flex items-center justify-center border border-blue-500/30">
                                                {c.userId?.fullname?.[0]?.toUpperCase() || 'C'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-white">{c.userId?.fullname}</div>
                                                <div className="text-[11px] text-gray-400">{c.userId?.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={c.role}
                                                onChange={(e) => handleUpdateCollabRole(c._id, e.target.value)}
                                                className="px-2.5 py-1 text-xs bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                                            >
                                                <option value="editor">Editor</option>
                                                <option value="reviewer">Reviewer</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveCollaborator(c._id)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Remove collaborator"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {collaborators.length === 0 && (
                                    <div className="text-center py-6 text-xs text-gray-500">
                                        No external collaborators added yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SELECTED STUDENTS ACCESS */}
                    {activeTab === 'students' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search students by name or email..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {filteredStudents.map(student => {
                                    const hasAccess = grantedUserIds.has(student._id);
                                    return (
                                        <div
                                            key={student._id}
                                            onClick={() => handleToggleStudentAccess(student._id, hasAccess)}
                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                                hasAccess
                                                    ? 'bg-purple-950/20 border-purple-600/40 text-white'
                                                    : 'bg-gray-900/30 border-gray-800 text-gray-300 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                                    hasAccess ? 'bg-purple-600 border-purple-500 text-white' : 'border-gray-600 bg-transparent'
                                                }`}>
                                                    {hasAccess && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-medium">{student.fullname}</div>
                                                    <div className="text-[11px] text-gray-400">{student.email}</div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                hasAccess ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800 text-gray-500'
                                            }`}>
                                                {hasAccess ? 'Access Granted' : 'No Access'}
                                            </span>
                                        </div>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <div className="text-center py-6 text-xs text-gray-500">
                                        No students found matching search.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-[#1e2029] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormShareModal;
