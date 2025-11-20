import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileSystemItem, FileType, FileOperationProgress } from '../types';
import { FileIcon } from './FileIcon';
import { TAG_COLORS } from '../constants';
import { ChevronLeft, ChevronRight, Search, LayoutGrid, List, HardDrive, Cloud, Download, Upload, Cpu, CornerDownRight, Image as ImageIcon, FileText, Loader2, ArrowUpDown, Check, Tag, Server, Database, Trash, Reply, Menu } from 'lucide-react';

interface FinderWindowProps {
  currentFolderId: string;
  items: FileSystemItem[];
  selectedItemIds: string[];
  onNavigate: (folderId: string) => void;
  onSelect: (id: string, multi: boolean) => void;
  onOpenFile: (item: FileSystemItem) => void;
  onUpload: (files: FileList) => void;
  onGoBack: () => void;
  onMoveFile: (sourceId: string, targetFolderId: string, newPosition?: {x: number, y: number}) => void;
  onReposition: (id: string, newPosition: {x: number, y: number}) => void;
  onSwapFile: (sourceId: string, targetId: string) => void;
  path: FileSystemItem[];
  opProgress: FileOperationProgress | null;
  renamingId: string | null;
  onRenameStart: (id: string) => void;
  onRenameConfirm: (id: string, newName: string) => void;
  onRenameCancel: () => void;
  downloadingId?: string | null;
  onContextMenu: (e: React.MouseEvent, itemId: string) => void;
  onEmptyTrash?: () => void;
  onRestore?: (id?: string) => void;
  onPermanentDelete?: (id?: string) => void;
}

type SortOption = 'name' | 'date' | 'size' | 'kind' | 'none';

export const FinderWindow: React.FC<FinderWindowProps> = ({
  currentFolderId,
  items,
  selectedItemIds,
  onNavigate,
  onSelect,
  onOpenFile,
  onUpload,
  onGoBack,
  onMoveFile,
  onReposition,
  onSwapFile,
  path,
  opProgress,
  renamingId,
  onRenameStart,
  onRenameConfirm,
  onRenameCancel,
  downloadingId,
  onContextMenu,
  onEmptyTrash,
  onRestore,
  onPermanentDelete
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  
  // Drag state management
  const [dragTarget, setDragTarget] = useState<'none' | 'internal' | 'external'>('none');
  const dragTimeoutRef = useRef<NodeJS.Timeout>(null);

  const isTagView = currentFolderId.startsWith('tag:');
  const isTrashView = currentFolderId === 'trash';
  const currentTagId = isTagView ? currentFolderId.replace('tag:', '') : null;
  const currentTag = TAG_COLORS.find(t => t.id === currentTagId);

  // Click outside handler for sort menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
              setIsSortMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFolderItems = useMemo(() => {
    let filtered = [];
    
    if (isTagView) {
        // Filter ALL items for this tag
        filtered = items.filter(item => item.tags?.includes(currentTagId!));
    } else {
        // Normal Folder View
        filtered = items.filter(item => item.parentId === currentFolderId);
    }
    
    // Search filtering
    if (searchQuery) {
        filtered = filtered.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (sortBy === 'none') {
        return filtered.sort((a, b) => a.order - b.order);
    }

    return filtered.sort((a, b) => {
        switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name);
            case 'date': return b.dateModified - a.dateModified; // Newest first
            case 'size': return (b.size || 0) - (a.size || 0); // Largest first
            case 'kind': return a.type.localeCompare(b.type);
            default: return 0;
        }
    });
  }, [items, currentFolderId, searchQuery, sortBy, isTagView, currentTagId]);

  // Default Position Calculator for Grid View (Enforced Grid)
  const getItemPosition = (item: FileSystemItem, index: number) => {
      const cols = Math.max(2, Math.floor((contentRef.current?.clientWidth || 800) / 110));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
          x: 20 + col * 110,
          y: 20 + row * 120
      };
  };

  // Enhanced Drag Handlers for Window Background
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

    if (e.dataTransfer.types.includes('application/react-finder-id')) {
        // Allow drop anywhere
    } else if (e.dataTransfer.types.includes('Files')) {
        setDragTarget('external');
    }
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = setTimeout(() => {
          setDragTarget('none');
      }, 100);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget('none');
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

    const sourceId = e.dataTransfer.getData('application/react-finder-id');

    // Handle internal moves
    if (sourceId) {
        const item = items.find(i => i.id === sourceId);
        
        if (!isTagView && item && item.parentId === currentFolderId) {
            return;
        } else if (!isTagView && !isTrashView) { // Prevent moving stuff around INSIDE trash view
            onMoveFile(sourceId, currentFolderId);
        }
        return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isTagView && !isTrashView) {
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className="flex flex-col h-full w-full overflow-hidden rounded-b-xl relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors"
    >
      {/* Toolbar */}
      <div className="h-12 bg-gray-100/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between shrink-0 z-20">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Mobile Sidebar Toggle */}
          <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="md:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
             <Menu className="w-5 h-5" />
          </button>

          <div className="flex space-x-1 hidden sm:flex">
            <button onClick={onGoBack} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30" disabled={path.length <= 1 && !isTagView && !isTrashView}>
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30" disabled>
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-1 overflow-hidden">
            {isTagView ? (
                <span className="flex items-center truncate">
                    <span 
                        className="w-3 h-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: currentTag?.hex || '#999' }}
                    ></span>
                    Tag: {currentTag?.label || 'Unknown'}
                </span>
            ) : isTrashView ? (
                <span className="flex items-center text-gray-600 dark:text-gray-300 truncate">
                    <Trash className="w-4 h-4 mr-2 shrink-0" /> Trash Bin
                </span>
            ) : (
                path.map((p, idx) => (
                <BreadcrumbItem 
                    key={p.id} 
                    item={p} 
                    isLast={idx === path.length - 1} 
                    onNavigate={onNavigate} 
                    onMoveFile={onMoveFile} 
                />
                ))
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-3">
           {isTrashView ? (
               <div className="flex items-center space-x-2">
                   {selectedItemIds.length > 0 && (
                       <>
                        <button 
                            onClick={() => onRestore && onRestore()} 
                            className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center shadow-sm"
                        >
                            <Reply className="w-3 h-3 mr-1"/> <span className="hidden md:inline">Restore</span>
                        </button>
                        <button 
                            onClick={() => onPermanentDelete && onPermanentDelete()} 
                            className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center shadow-sm"
                        >
                            <Trash className="w-3 h-3 md:mr-1"/> <span className="hidden md:inline">Delete</span>
                        </button>
                       </>
                   )}
                   <button 
                      onClick={onEmptyTrash}
                      className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center shadow-sm font-medium"
                   >
                       Empty <span className="hidden md:inline ml-1">Trash</span>
                   </button>
               </div>
           ) : (
               <>
                {opProgress && (
                    <div className="hidden md:flex items-center space-x-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md shadow-sm border dark:border-gray-600 animate-pulse">
                        <div className="flex flex-col justify-center w-24">
                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-300 mb-0.5">
                                <span>{opProgress.type === 'UPLOAD' ? 'Up...' : 'Down...'}</span>
                                <span>{Math.round(opProgress.progress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${opProgress.progress}%`}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <label className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Upload Large File">
                    <input type="file" className="hidden" multiple onChange={(e) => e.target.files && onUpload(e.target.files)} disabled={isTagView} />
                    <Upload className={`w-4 h-4 ${isTagView ? 'opacity-30' : ''}`} />
                </label>
               </>
           )}

           {/* Sort Menu */}
           <div className="relative" ref={sortMenuRef}>
               <button 
                    onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                    className={`p-1 rounded flex items-center space-x-1 ${isSortMenuOpen ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    title="Arrange By"
                >
                   <ArrowUpDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
               </button>
               {isSortMenuOpen && (
                   <div className="absolute top-full right-0 mt-1 w-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 text-sm animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Arrange By</div>
                        {[
                            { id: 'none', label: 'None' },
                            { id: 'name', label: 'Name' },
                            { id: 'date', label: 'Date Modified' },
                            { id: 'size', label: 'Size' },
                            { id: 'kind', label: 'Kind' }
                        ].map((opt) => (
                            <button 
                                key={opt.id}
                                onClick={() => { setSortBy(opt.id as SortOption); setIsSortMenuOpen(false); }}
                                className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-blue-500 hover:text-white group text-gray-700 dark:text-gray-200"
                            >
                                <span>{opt.label}</span>
                                {sortBy === opt.id && <Check className="w-3 h-3 text-blue-500 group-hover:text-white" />}
                            </button>
                        ))}
                   </div>
               )}
           </div>

          <div className="hidden md:flex bg-gray-200/50 dark:bg-gray-700/50 rounded-md p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300/50 dark:hover:bg-gray-600/50'}`}
            >
              <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300/50 dark:hover:bg-gray-600/50'}`}
            >
              <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1.5" />
            <input 
              type="text" 
              placeholder="Search" 
              className="pl-8 pr-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-20 focus:w-32 lg:w-48 transition-all text-gray-800 dark:text-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar (Desktop + Mobile Drawer) */}
        <div className={`
            absolute md:relative z-30 h-full w-56 md:w-48 
            bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-xl md:backdrop-blur-none
            border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col space-y-4 shrink-0 
            transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto
            ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-2">Favorites</div>
            <SidebarItem icon={Cloud} label="UR Drive" active={currentFolderId === 'root'} onClick={() => { onNavigate('root'); setShowMobileSidebar(false); }} onMoveFile={onMoveFile} targetId="root" />
            <SidebarItem icon={FileText} label="Documents" active={currentFolderId === 'docs'} onClick={() => { onNavigate('docs'); setShowMobileSidebar(false); }} onMoveFile={onMoveFile} targetId="docs" />
            <SidebarItem icon={ImageIcon} label="Images" active={currentFolderId === 'imgs'} onClick={() => { onNavigate('imgs'); setShowMobileSidebar(false); }} onMoveFile={onMoveFile} targetId="imgs" />
            <SidebarItem icon={Download} label="Downloads" onClick={() => {}} />
            <SidebarItem icon={Trash} label="Trash Bin" active={currentFolderId === 'trash'} onClick={() => { onNavigate('trash'); setShowMobileSidebar(false); }} onMoveFile={onMoveFile} targetId="trash" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-2">Locations</div>
            <SidebarItem icon={HardDrive} label="UR System" active={false} onClick={() => { onNavigate('root'); setShowMobileSidebar(false); }} onMoveFile={onMoveFile} targetId="root" />
            <SidebarItem icon={Server} label="Lab Server (SMB)" onClick={() => {}} />
            <SidebarItem icon={Database} label="UR Backup Ext" onClick={() => {}} />
            <SidebarItem icon={Cpu} label="Network" onClick={() => {}} />
          </div>
          {/* TAGS SECTION */}
          <div>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 px-2">Tags</div>
              {TAG_COLORS.map(tag => (
                  <div 
                    key={tag.id}
                    onClick={() => { onNavigate(`tag:${tag.id}`); setShowMobileSidebar(false); }}
                    className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 group ${
                        currentFolderId === `tag:${tag.id}`
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                     <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: tag.hex }}></div>
                     <span className="truncate">{tag.label}</span>
                  </div>
              ))}
          </div>
        </div>

        {/* Mobile Overlay */}
        {showMobileSidebar && (
            <div className="absolute inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
        )}

        {/* Main Content */}
        <div 
          ref={contentRef}
          className={`flex-1 bg-white dark:bg-gray-900 overflow-auto p-4 relative transition-colors`}
          onClick={() => onSelect('', false)} 
          onDragOver={handleWindowDragOver}
          onDragLeave={handleWindowDragLeave}
          onDrop={handleDrop}
        >
          {viewMode === 'grid' ? (
            <div className="w-full h-full min-h-[200px] relative">
              {currentFolderItems.map((item, index) => {
                 const pos = getItemPosition(item, index);
                 return (
                    <div
                        key={item.id}
                        className="absolute transition-all duration-200"
                        style={{ left: pos.x, top: pos.y }}
                    >
                        <FileIcon 
                          item={item} 
                          selected={selectedItemIds.includes(item.id)}
                          onSelect={onSelect}
                          onDoubleClick={onOpenFile}
                          onMove={(s, t) => !isTrashView && onMoveFile(s, t)}
                          onSwap={onSwapFile}
                          isRenaming={renamingId === item.id}
                          onRenameStart={onRenameStart}
                          onRenameConfirm={onRenameConfirm}
                          onRenameCancel={onRenameCancel}
                          isLoading={downloadingId === item.id}
                          onContextMenu={(e) => onContextMenu(e, item.id)}
                        />
                    </div>
                 );
              })}
              {currentFolderItems.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                  {isTagView ? (
                      <>
                        <Tag className="w-12 h-12 mb-2 opacity-20" />
                        <span>No files with this tag</span>
                      </>
                  ) : isTrashView ? (
                      <>
                        <Trash className="w-12 h-12 mb-2 opacity-20" />
                        <span>Trash is empty</span>
                      </>
                  ) : (
                      <>
                        <span className="text-4xl mb-2">📂</span>
                        <span>Folder is empty</span>
                      </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left relative text-gray-700 dark:text-gray-300 min-w-[500px]">
                <thead className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <tr>
                    <th className="py-2 font-medium pl-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => setSortBy('name')}>Name</th>
                    <th className="py-2 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 hidden sm:table-cell" onClick={() => setSortBy('date')}>Date Modified</th>
                    <th className="py-2 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 hidden sm:table-cell" onClick={() => setSortBy('size')}>Size</th>
                    <th className="py-2 font-medium cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 hidden md:table-cell" onClick={() => setSortBy('kind')}>Kind</th>
                    {isTrashView && <th className="py-2 font-medium">Origin</th>}
                    {!isTrashView && <th className="py-2 font-medium hidden sm:table-cell">Tags</th>}
                    </tr>
                </thead>
                <tbody>
                    {currentFolderItems.map(item => (
                    <ListItem 
                        key={item.id}
                        item={item}
                        selected={selectedItemIds.includes(item.id)}
                        isRenaming={renamingId === item.id}
                        onSelect={onSelect}
                        onOpenFile={onOpenFile}
                        onMoveFile={!isTrashView ? onMoveFile : undefined}
                        onSwapFile={!isTrashView ? onSwapFile : undefined}
                        onRenameStart={onRenameStart}
                        onRenameConfirm={onRenameConfirm}
                        onRenameCancel={onRenameCancel}
                        isLoading={downloadingId === item.id}
                        onContextMenu={(e: React.MouseEvent) => onContextMenu(e, item.id)}
                        isTrashView={isTrashView}
                    />
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, onMoveFile, targetId }: { icon: any, label: string, active?: boolean, onClick: () => void, onMoveFile?: (s:string, t:string)=>void, targetId?: string }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
      if (targetId && onMoveFile && e.dataTransfer.types.includes('application/react-finder-id')) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
      }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
      if (targetId && onMoveFile) {
          const sourceId = e.dataTransfer.getData('application/react-finder-id');
          if (sourceId) {
              e.preventDefault();
              e.stopPropagation();
              onMoveFile(sourceId, targetId);
              setIsDragOver(false);
          }
      }
  };

  return (
    <div 
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 group ${
            active 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                : isDragOver 
                    ? 'bg-blue-500 text-white shadow-md scale-105 pl-3' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
        }`}
    >
        <Icon className={`w-4 h-4 mr-2 transition-colors ${
            isDragOver ? 'text-white' : active ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
        }`} />
        <span className="truncate">{label}</span>
    </div>
  );
};

const BreadcrumbItem: React.FC<{item: FileSystemItem, isLast: boolean, onNavigate: (id:string)=>void, onMoveFile: (s:string, t:string)=>void}> = ({item, isLast, onNavigate, onMoveFile}) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        if (!isLast && e.dataTransfer.types.includes('application/react-finder-id')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
         if (!isLast) {
             const sourceId = e.dataTransfer.getData('application/react-finder-id');
             if (sourceId) {
                 e.preventDefault();
                 e.stopPropagation();
                 onMoveFile(sourceId, item.id);
                 setIsDragOver(false);
             }
         }
    };

    return (
        <span className="flex items-center shrink-0">
             <button 
                onClick={() => onNavigate(item.id)} 
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`hover:bg-gray-200 dark:hover:bg-gray-700 px-1 rounded transition-colors truncate max-w-[100px] ${isDragOver ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-300' : ''}`}
             >
                {item.name}
             </button>
             {!isLast && <span className="text-gray-400 mx-1">/</span>}
        </span>
    );
};

// Extracted List Item
const ListItem: React.FC<any> = ({item, selected, isRenaming, onSelect, onOpenFile, onMoveFile, onSwapFile, onRenameStart, onRenameConfirm, onRenameCancel, isLoading, onContextMenu, isTrashView}) => {
    const [editName, setEditName] = useState(item.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
            setEditName(item.name);
        }
    }, [isRenaming, item.name]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onRenameConfirm(item.id, editName);
        if (e.key === 'Escape') onRenameCancel();
    };

    // Drag handling for list item swap (simplified)
    const handleDrop = (e: React.DragEvent) => {
        const sourceId = e.dataTransfer.getData('application/react-finder-id');
        if (sourceId && sourceId !== item.id && onMoveFile) {
            e.preventDefault();
            e.stopPropagation();
            // In list view, visual feedback is harder, but we can still allow swap
            if(item.type === FileType.FOLDER) {
                onMoveFile(sourceId, item.id);
            } else if(onSwapFile) {
                onSwapFile(sourceId, item.id);
            }
        }
    }

    return (
        <tr 
            className={`border-b border-gray-50 dark:border-gray-800 cursor-default transition-colors ${selected ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            onClick={(e) => {
                e.stopPropagation();
                if(!isRenaming) onSelect(item.id, e.metaKey || e.ctrlKey);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if(!isRenaming) onOpenFile(item);
            }}
            onContextMenu={onContextMenu}
            draggable={!isRenaming}
            onDragStart={(e) => {
                e.dataTransfer.setData('application/react-finder-id', item.id);
            }}
            onDragOver={(e) => !isTrashView && e.preventDefault()}
            onDrop={handleDrop}
        >
            <td className="py-2 px-2 flex items-center">
            <div className="mr-2 transform scale-75 origin-left pointer-events-none relative">
                <FileIcon 
                    item={item} 
                    selected={false} 
                    onSelect={()=>{}} 
                    onDoubleClick={()=>{}} 
                    className="w-8 h-8 p-0 !mb-0 !bg-transparent"
                />
                {isLoading && <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-white"/></div>}
            </div>
            {isRenaming ? (
                 <input 
                    ref={inputRef}
                    className="border border-blue-500 rounded px-1 py-0.5 text-sm focus:outline-none text-black"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => onRenameConfirm(item.id, editName)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                 />
            ) : (
                <div className="flex items-center">
                    <span onDoubleClick={(e) => { 
                        e.stopPropagation(); 
                        if (!isTrashView) onRenameStart(item.id); 
                    }}>
                        {item.name}
                    </span>
                     {isLoading && <span className="ml-2 text-xs text-gray-400 animate-pulse">Downloading...</span>}
                </div>
            )}
            </td>
            <td className="py-2 hidden sm:table-cell">{new Date(item.dateModified).toLocaleDateString()}</td>
            <td className="py-2 hidden sm:table-cell">{item.size ? (item.size / 1024).toFixed(1) + ' KB' : '--'}</td>
            <td className="py-2 hidden md:table-cell">{item.type}</td>
            {isTrashView ? (
                <td className="py-2 text-xs text-gray-500 italic">From: {item.trashData?.originalParentId === 'root' ? 'Root' : 'Folder...'}</td>
            ) : (
                <td className="py-2 hidden sm:table-cell">
                    <div className="flex space-x-1">
                        {item.tags?.map((tagId: string) => {
                            const color = TAG_COLORS.find(t => t.id === tagId)?.hex || '#ccc';
                            return (
                                <div key={tagId} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                            );
                        })}
                    </div>
                </td>
            )}
        </tr>
    )
}