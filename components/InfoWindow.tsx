
import React, { useState, useEffect } from 'react';
import { FileSystemItem, FileType, UserRole } from '../types';
import { Folder, FileText, Image as ImageIcon, Film, File, FileCode, Music, Archive, FileSpreadsheet, Shield, Users, Lock, Tag, CheckCircle2, Circle } from 'lucide-react';
import { TAG_COLORS } from '../constants';

interface InfoWindowProps {
    item: FileSystemItem;
    path: string;
    onRename: (id: string, newName: string) => void;
    onClose: () => void;
    currentUserRole?: UserRole;
    onUpdateVisibility: (visibleTo: UserRole[]) => void;
    onUpdateTags: (tags: string[]) => void;
}

export const InfoWindow: React.FC<InfoWindowProps> = ({ item, path, onRename, onClose, currentUserRole, onUpdateVisibility, onUpdateTags }) => {
    const [name, setName] = useState(item.name);
    const [visibleTo, setVisibleTo] = useState<UserRole[]>(item.visibleTo || []);
    const [tags, setTags] = useState<string[]>(item.tags || []);
    
    useEffect(() => {
        setName(item.name);
        setVisibleTo(item.visibleTo || []);
        setTags(item.tags || []);
    }, [item]);

    const isAdmin = currentUserRole === UserRole.ADMIN;
    const canEditName = true; 

    const getIcon = () => {
        const props = { className: "w-full h-full shadow-lg drop-shadow-2xl" };
        switch (item.type) {
            case FileType.FOLDER: return <Folder {...props} className="w-full h-full text-blue-500 fill-blue-500/20" />;
            case FileType.IMAGE: return <ImageIcon {...props} className="w-full h-full text-purple-500" />;
            case FileType.TEXT: return <FileText {...props} className="w-full h-full text-gray-500" />;
            case FileType.VIDEO: return <Film {...props} className="w-full h-full text-red-500" />;
            case FileType.CODE: return <FileCode {...props} className="w-full h-full text-green-500" />;
            case FileType.AUDIO: return <Music {...props} className="w-full h-full text-pink-500" />;
            case FileType.ARCHIVE: return <Archive {...props} className="w-full h-full text-yellow-600" />;
            case FileType.SHEET: return <FileSpreadsheet {...props} className="w-full h-full text-emerald-600" />;
            default: return <File {...props} className="w-full h-full text-gray-400" />;
        }
    };

    const formatSize = (bytes?: number) => {
        if (bytes === undefined) return '--';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (ts?: number) => {
        if (!ts) return '--';
        return new Date(ts).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
    };

    const handleBlur = () => {
        if (name.trim() && name.trim() !== item.name) {
            onRename(item.id, name);
        } else {
            setName(item.name); 
        }
    };

    const toggleGroup = (role: UserRole) => {
        if (!isAdmin) return;
        let newVisible = [...visibleTo];
        if (newVisible.includes(role)) {
            newVisible = newVisible.filter(r => r !== role);
        } else {
            newVisible.push(role);
        }
        setVisibleTo(newVisible);
        onUpdateVisibility(newVisible);
    };

    const toggleTag = (tagId: string) => {
        let newTags = [...tags];
        if (newTags.includes(tagId)) {
            newTags = newTags.filter(t => t !== tagId);
        } else {
            newTags.push(tagId);
        }
        setTags(newTags);
        onUpdateTags(newTags);
    };

    const renderVisibilitySwatches = () => {
        if (!isAdmin) return null;

        const roles = [
            { role: UserRole.ADMIN, label: 'Admin', colorClass: 'bg-red-500', ringClass: 'ring-red-400', locked: true },
            { role: UserRole.USER, label: 'User', colorClass: 'bg-blue-500', ringClass: 'ring-blue-400', locked: false },
            { role: UserRole.JUNIOR, label: 'Junior', colorClass: 'bg-green-500', ringClass: 'ring-green-400', locked: false }
        ];

        return (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 duration-300">
                <div className="font-bold mb-4 flex items-center text-gray-700 dark:text-gray-300">
                    <Shield className="w-3.5 h-3.5 mr-2 text-blue-500" /> 
                    <span className="text-[10px] uppercase tracking-wide opacity-80">Access Control</span>
                </div>
                
                <div className="flex justify-center items-center gap-4 mb-2">
                    {roles.map(({ role, label, colorClass, ringClass, locked }) => {
                        const isVisible = visibleTo.includes(role) || locked; // Admin always visible
                        const isToggled = visibleTo.includes(role);
                        
                        return (
                            <div 
                                key={role} 
                                className={`flex flex-col items-center gap-2 group ${locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !locked && toggleGroup(role)}
                            >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative
                                    ${isVisible ? colorClass : 'bg-gray-200 dark:bg-gray-700'}
                                    ${!locked && isVisible ? `ring-2 ${ringClass} ring-offset-2 dark:ring-offset-gray-800 scale-105` : ''}
                                    ${!locked && !isVisible ? 'hover:bg-gray-300 dark:hover:bg-gray-600' : ''}
                                `}>
                                    {locked ? (
                                        <Lock className="w-5 h-5 text-white" />
                                    ) : (
                                        <Users className={`w-5 h-5 transition-colors ${isVisible ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                                    )}
                                    
                                    {/* Status Checkmark for Active Roles */}
                                    {isVisible && !locked && (
                                        <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm">
                                            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 mt-4">
                     <p className="text-[10px] text-center text-blue-600 dark:text-blue-300 leading-tight">
                        Tap a user group above to toggle file visibility. <br/>
                        <span className="opacity-70">Visible groups have full Read/Write access.</span>
                     </p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs select-text">
             {/* Top Section */}
             <div className="p-6 flex flex-col items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 backdrop-blur-sm">
                 <div className="w-20 h-20 mb-4 transition-transform hover:scale-105 duration-300 relative">
                     {getIcon()}
                     {/* Permission Dot Indicator in Info Window too */}
                     <div className={`absolute -top-2 -left-2 w-4 h-4 rounded-full border-2 border-white shadow-md 
                        ${visibleTo.includes(UserRole.JUNIOR) ? 'bg-green-500' : visibleTo.includes(UserRole.USER) ? 'bg-blue-500' : 'bg-red-500'}
                     `}></div>
                 </div>
                 <div className="w-full px-4 max-w-[250px]">
                    <label className="block text-[10px] font-semibold mb-1.5 text-center text-gray-400 uppercase tracking-wider">Name</label>
                    <input 
                        className={`w-full text-center bg-transparent border border-transparent rounded px-2 py-1 font-semibold text-sm focus:outline-none transition-all ${canEditName ? 'hover:border-gray-300 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700' : 'cursor-default opacity-70'}`}
                        value={name}
                        onChange={(e) => canEditName && setName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        disabled={!canEditName}
                    />
                 </div>
             </div>

             {/* Details Section */}
             <div className="flex-1 overflow-y-auto p-5 space-y-6">
                 <InfoSection title="General">
                     <InfoRow label="Kind" value={item.type} />
                     <InfoRow label="Size" value={formatSize(item.size)} />
                     <InfoRow label="Where" value={path} />
                     <InfoRow label="Created" value={formatDate(item.dateCreated || item.dateModified)} />
                     <InfoRow label="Modified" value={formatDate(item.dateModified)} />
                 </InfoSection>
                 
                 {/* Tags Section */}
                 <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                     <div className="font-bold mb-2 flex items-center text-gray-700 dark:text-gray-300">
                        <span className="mr-2 text-[10px] opacity-70">▼</span> Tags
                     </div>
                     <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                         {TAG_COLORS.map(tag => (
                             <button
                                key={tag.id}
                                onClick={() => toggleTag(tag.id)}
                                title={tag.label}
                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none flex items-center justify-center ring-offset-1 dark:ring-offset-gray-800 ${tags.includes(tag.id) ? 'ring-2 ring-blue-400 scale-110' : ''}`}
                                style={{ backgroundColor: tag.hex }}
                             >
                                 {tags.includes(tag.id) && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                             </button>
                         ))}
                         {tags.length === 0 && <span className="text-gray-400 italic text-[10px] py-1">No tags selected</span>}
                     </div>
                 </div>

                 <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="font-bold mb-2 flex items-center text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                        <span className="mr-2 text-[10px] opacity-70">▼</span> More Info
                    </div>
                 </div>

                 {/* Permissions Section (Only visible to Admins) */}
                 {renderVisibilitySwatches()}
             </div>
        </div>
    );
};

const InfoSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-2">
        <div className="font-bold border-b border-gray-200 dark:border-gray-700 pb-1.5 text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wide opacity-80">
            {title}
        </div>
        <div className="space-y-1.5 pl-1">
            {children}
        </div>
    </div>
);

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex text-[11px] leading-relaxed">
        <span className="w-16 text-gray-500 dark:text-gray-400 text-right mr-4 shrink-0 font-medium">{label}:</span>
        <span className="text-gray-800 dark:text-gray-200 break-words flex-1">{value}</span>
    </div>
);
