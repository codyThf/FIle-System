
import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Image as ImageIcon, Film, File, FileCode, Music, Archive, FileSpreadsheet, Loader2 } from 'lucide-react';
import { FileType, FileSystemItem, UserRole } from '../types';
import { TAG_COLORS } from '../constants';

interface FileIconProps {
  item: FileSystemItem;
  selected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onDoubleClick: (item: FileSystemItem) => void;
  onMove?: (sourceId: string, targetId: string) => void;
  onSwap?: (sourceId: string, targetId: string) => void;
  isRenaming?: boolean;
  onRenameConfirm?: (id: string, newName: string) => void;
  onRenameCancel?: () => void;
  onRenameStart?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const FileIcon: React.FC<FileIconProps> = ({ 
  item, 
  selected, 
  onSelect, 
  onDoubleClick, 
  onMove, 
  onSwap,
  isRenaming,
  onRenameConfirm,
  onRenameCancel,
  onRenameStart,
  isLoading,
  className,
  onContextMenu
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSwapTarget, setIsSwapTarget] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isRenaming && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
          setEditName(item.name);
      }
  }, [isRenaming, item.name]);

  const getIcon = () => {
    switch (item.type) {
      case FileType.FOLDER: return <Folder className="w-full h-full text-blue-500 fill-blue-500/20" />;
      case FileType.IMAGE: return <ImageIcon className="w-full h-full text-purple-500" />;
      case FileType.TEXT: return <FileText className="w-full h-full text-gray-500" />;
      case FileType.VIDEO: return <Film className="w-full h-full text-red-500" />;
      case FileType.CODE: return <FileCode className="w-full h-full text-green-500" />;
      case FileType.AUDIO: return <Music className="w-full h-full text-pink-500" />;
      case FileType.ARCHIVE: return <Archive className="w-full h-full text-yellow-600" />;
      case FileType.SHEET: return <FileSpreadsheet className="w-full h-full text-emerald-600" />;
      default: return <File className="w-full h-full text-gray-400" />;
    }
  };

  // Calculate Visibility Status Dot Color
  const getVisibilityDot = () => {
      if (item.visibleTo.includes(UserRole.JUNIOR)) return 'bg-green-500'; // All groups
      if (item.visibleTo.includes(UserRole.USER)) return 'bg-blue-500';   // Admin + User
      return 'bg-red-500'; // Admin Only
  };
  
  const getVisibilityLabel = () => {
      if (item.visibleTo.includes(UserRole.JUNIOR)) return 'Visible to: All Groups';
      if (item.visibleTo.includes(UserRole.USER)) return 'Visible to: Admin, User';
      return 'Visible to: Admin Only';
  };

  const handleDragStart = (e: React.DragEvent) => {
      if (isRenaming) {
          e.preventDefault();
          return;
      }
      e.dataTransfer.setData('application/react-finder-id', item.id);
      
      // Calculate offset for smoother dragging
      const rect = (e.target as Element).getBoundingClientRect();
      e.dataTransfer.setData('application/offset-x', (e.clientX - rect.left).toString());
      e.dataTransfer.setData('application/offset-y', (e.clientY - rect.top).toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (item.type === FileType.FOLDER) {
          setIsDragOver(true);
      } else {
          setIsSwapTarget(true);
      }
  };

  const handleDragLeave = () => {
      setIsDragOver(false);
      setIsSwapTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsSwapTarget(false);
      
      const sourceId = e.dataTransfer.getData('application/react-finder-id');
      if (!sourceId || sourceId === item.id) return;

      if (item.type === FileType.FOLDER && onMove) {
          onMove(sourceId, item.id);
      } else if (onSwap) {
          onSwap(sourceId, item.id);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          onRenameConfirm?.(item.id, editName);
      }
      if (e.key === 'Escape') {
          onRenameCancel?.();
      }
  };

  return (
    <div 
      className={`flex flex-col items-center w-[100px] p-2 rounded-lg transition-all duration-200 group/icon ${
          selected ? 'bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200/50' : 'hover:bg-black/5 dark:hover:bg-white/10'
      } ${isDragOver ? 'bg-blue-200 dark:bg-blue-800 scale-105 ring-2 ring-blue-400' : ''} 
      ${isSwapTarget ? 'translate-x-2' : ''} ${className || ''}`}
      onClick={(e) => {
          e.stopPropagation();
          if (!isRenaming) onSelect(item.id, e.metaKey || e.ctrlKey);
      }}
      onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isRenaming) onDoubleClick(item);
      }}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
          if (onContextMenu) {
              onContextMenu(e);
          }
      }}
    >
      <div className="w-12 h-12 mb-1 relative transition-transform active:scale-95">
        {/* Visibility Dot */}
        <div 
            className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm z-10 ${getVisibilityDot()}`}
            title={getVisibilityLabel()}
        ></div>

        {getIcon()}
        
        {isLoading && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-20">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
        )}
      </div>

      {isRenaming ? (
          <input 
            ref={inputRef}
            className="w-full text-center text-xs bg-white dark:bg-gray-800 text-black dark:text-white border border-blue-500 rounded px-1 py-0.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => onRenameConfirm?.(item.id, editName)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
      ) : (
          <div className="flex flex-col items-center w-full">
              <span 
                className={`text-xs text-center truncate w-full px-1 rounded leading-tight ${
                    selected 
                        ? 'bg-blue-500 text-white font-medium' 
                        : className?.includes('text-white') 
                            ? 'text-white font-medium drop-shadow-md' 
                            : 'text-gray-700 dark:text-gray-300'
                }`}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRenameStart?.(item.id);
                }}
              >
                {item.name}
              </span>
              {/* Render Tag Dots */}
              {item.tags && item.tags.length > 0 && (
                  <div className="flex space-x-1 mt-1 justify-center">
                      {item.tags.map(tagId => {
                          const color = TAG_COLORS.find(t => t.id === tagId)?.hex || '#ccc';
                          return (
                              <div 
                                key={tagId} 
                                className="w-1.5 h-1.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                                style={{ backgroundColor: color }}
                              ></div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
