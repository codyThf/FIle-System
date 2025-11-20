import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MenuBar } from './components/MenuBar';
import { Dock } from './components/Dock';
import { Window } from './components/Window';
import { FinderWindow } from './components/FinderWindow';
import { SettingsWindow } from './components/SettingsWindow';
import { InfoWindow } from './components/InfoWindow';
import { ProgressDialog } from './components/ProgressDialog';
import { LoginScreen } from './components/LoginScreen';
import { INITIAL_FILES, WALLPAPERS, DEFAULT_USERS } from './constants';
import { FileSystemItem, FileType, WindowState, FileOperationProgress, HistoryAction, User, UserRole } from './types';
import { summarizeFileContent, askAI } from './services/geminiService';
import { Loader2, Sparkles, Edit2, Download as DownloadIcon, Trash, RotateCcw, RotateCw, Info, Lock, EyeOff, Check, Eye, Users, Reply, Copy, Clipboard } from 'lucide-react';

// --- Helper Components ---
import { FileIcon } from './components/FileIcon';

const TRASH_ID = 'trash';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileSystemItem[]>(INITIAL_FILES);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS); // Manage users state
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [topZIndex, setTopZIndex] = useState(10);
  const [opProgress, setOpProgress] = useState<FileOperationProgress | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, itemId: string | null} | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Clipboard State
  const [clipboard, setClipboard] = useState<{ ids: string[], op: 'COPY' } | null>(null);

  // Undo/Redo State
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [notification, setNotification] = useState<{msg: string, visible: boolean, isError?: boolean} | null>(null);
  const [isSleep, setIsSleep] = useState(false);

  // Settings State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0].url);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
      const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Permission Logic ---
  // If a user can SEE a file, they can do ANYTHING with it.
  // Visibility is the only gatekeeper.
  const isFileVisible = useCallback((item: FileSystemItem): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.ADMIN) return true;
      return item.visibleTo.includes(currentUser.role);
  }, [currentUser]);

  const hasPermission = (item: FileSystemItem): boolean => {
      // Logic: If you can see it, you have full permissions (Read/Write/Delete)
      return isFileVisible(item);
  };

  const updateVisibility = (itemId: string, updatedVisibleTo: UserRole[]) => {
      if (currentUser?.role !== UserRole.ADMIN) {
          showPermissionError();
          return;
      }
      setFiles(prev => prev.map(f => f.id === itemId ? { ...f, visibleTo: updatedVisibleTo } : f));
  };

  const updateTags = (itemId: string, tags: string[]) => {
      setFiles(prev => prev.map(f => f.id === itemId ? { ...f, tags } : f));
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      if (currentUser?.id === updatedUser.id) {
          setCurrentUser(updatedUser);
      }
      showNotification("Profile updated successfully");
  };

  const handleVisibilityToggle = (targetId: string, roleToToggle: UserRole) => {
      if (currentUser?.role !== UserRole.ADMIN) {
          showPermissionError();
          return;
      }

      // Determine if we are acting on a batch selection
      const idsToUpdate = selectedFileIds.includes(targetId) 
          ? [...selectedFileIds] 
          : [targetId];

      setFiles(prev => prev.map(f => {
          if (idsToUpdate.includes(f.id)) {
              const isVisible = f.visibleTo.includes(roleToToggle);
              let newVisibleTo = [...f.visibleTo];
              
              if (isVisible) {
                  newVisibleTo = newVisibleTo.filter(r => r !== roleToToggle);
              } else {
                  newVisibleTo.push(roleToToggle);
              }
              return { ...f, visibleTo: newVisibleTo };
          }
          return f;
      }));

      setContextMenu(null);
      showNotification(`Updated visibility for ${idsToUpdate.length} item(s)`);
  };

  // Filter files for the current user view
  const visibleFiles = useMemo(() => {
      return files.filter(f => isFileVisible(f));
  }, [files, isFileVisible]);

  // --- Notification System ---
  const showNotification = (msg: string, isError: boolean = false) => {
      setNotification({ msg, visible: true, isError });
      setTimeout(() => setNotification(prev => prev ? { ...prev, visible: false } : null), 2000);
  };

  const showPermissionError = () => showNotification("Permission Denied: Access Restricted", true);

  // --- History Management ---
  const commitAction = (action: HistoryAction) => {
      setUndoStack(prev => [...prev, action]);
      setRedoStack([]); // Clear redo stack on new action
  };

  const performUndo = useCallback(() => {
      if (undoStack.length === 0) return;

      const action = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      
      // Logic to reverse action
      switch(action.type) {
          case 'RENAME':
              setFiles(prev => prev.map(f => f.id === action.payload.id ? { ...f, name: action.payload.oldName } : f));
              break;
          case 'MOVE':
              setFiles(prev => prev.map(f => {
                  const movedItem = action.payload.items.find((i: any) => i.id === f.id);
                  return movedItem ? { 
                      ...f, 
                      parentId: movedItem.oldParentId, 
                      order: movedItem.oldOrder,
                      position: movedItem.oldPosition 
                  } : f;
              }));
              break;
          case 'TRASH':
              // Undo Trash = Restore
               setFiles(prev => prev.map(f => {
                  if (action.payload.ids.includes(f.id)) {
                      return {
                          ...f,
                          parentId: f.trashData?.originalParentId || 'root',
                          trashData: undefined
                      };
                  }
                  return f;
               }));
               break;
          case 'RESTORE':
              // Undo Restore = Trash again
              setFiles(prev => prev.map(f => {
                  if (action.payload.ids.includes(f.id)) {
                       return {
                          ...f,
                          parentId: TRASH_ID,
                          trashData: { originalParentId: action.payload.originalParentId, dateTrashed: Date.now() }
                       };
                  }
                  return f;
               }));
               break;
          case 'REPOSITION':
              setFiles(prev => prev.map(f => 
                  f.id === action.payload.id ? { ...f, position: action.payload.oldPosition } : f
              ));
              break;
          case 'SWAP':
              setFiles(prev => {
                  const { sourceId, targetId, sourceOldOrder, targetOldOrder } = action.payload;
                  const newFiles = [...prev];
                  const sIdx = newFiles.findIndex(f => f.id === sourceId);
                  const tIdx = newFiles.findIndex(f => f.id === targetId);
                  if(sIdx > -1) newFiles[sIdx] = { ...newFiles[sIdx], order: sourceOldOrder };
                  if(tIdx > -1) newFiles[tIdx] = { ...newFiles[tIdx], order: targetOldOrder };
                  return newFiles;
              });
              break;
          case 'DELETE':
              // Permanent delete undo (restore files)
              setFiles(prev => [...prev, ...action.payload.files]);
              break;
          case 'CREATE':
              setFiles(prev => prev.filter(f => f.id !== action.payload.id));
              break;
          case 'PASTE':
              // Undo Paste = Delete newly created items
              const pastedIds = action.payload.newItems.map((f: FileSystemItem) => f.id);
              setFiles(prev => prev.filter(f => !pastedIds.includes(f.id)));
              break;
      }

      setRedoStack(prev => [...prev, action]);
      setUndoStack(newUndoStack);
      showNotification(`Undid ${action.description}`);
  }, [undoStack]);

  const performRedo = useCallback(() => {
      if (redoStack.length === 0) return;

      const action = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);

      switch(action.type) {
          case 'RENAME':
              setFiles(prev => prev.map(f => f.id === action.payload.id ? { ...f, name: action.payload.newName } : f));
              break;
          case 'MOVE':
              setFiles(prev => prev.map(f => {
                  const movedItem = action.payload.items.find((i: any) => i.id === f.id);
                  return movedItem ? { 
                      ...f, 
                      parentId: movedItem.newParentId, 
                      order: movedItem.newOrder,
                      position: movedItem.newPosition 
                  } : f;
              }));
              break;
           case 'TRASH':
               // Redo Trash
               setFiles(prev => prev.map(f => {
                  if (action.payload.ids.includes(f.id)) {
                      return {
                          ...f,
                          parentId: TRASH_ID,
                          trashData: { originalParentId: f.parentId, dateTrashed: Date.now() }
                      };
                  }
                  return f;
               }));
               break;
           case 'RESTORE':
              // Redo Restore
               setFiles(prev => prev.map(f => {
                  if (action.payload.ids.includes(f.id)) {
                      return {
                          ...f,
                          parentId: f.trashData?.originalParentId || 'root',
                          trashData: undefined
                      };
                  }
                  return f;
               }));
               break;
          case 'REPOSITION':
              setFiles(prev => prev.map(f => 
                  f.id === action.payload.id ? { ...f, position: action.payload.newPosition } : f
              ));
              break;
          case 'SWAP':
              setFiles(prev => {
                  const { sourceId, targetId, sourceNewOrder, targetNewOrder } = action.payload;
                  const newFiles = [...prev];
                  const sIdx = newFiles.findIndex(f => f.id === sourceId);
                  const tIdx = newFiles.findIndex(f => f.id === targetId);
                  if(sIdx > -1) newFiles[sIdx] = { ...newFiles[sIdx], order: sourceNewOrder };
                  if(tIdx > -1) newFiles[tIdx] = { ...newFiles[tIdx], order: targetNewOrder };
                  return newFiles;
              });
              break;
          case 'DELETE':
              const idsToDelete = action.payload.files.map((f: any) => f.id);
              setFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
              break;
          case 'CREATE':
               setFiles(prev => [...prev, action.payload.item]);
              break;
          case 'PASTE':
               // Redo Paste = Re-add items
               setFiles(prev => [...prev, ...action.payload.newItems]);
               break;
      }

      setUndoStack(prev => [...prev, action]);
      setRedoStack(newRedoStack);
      showNotification(`Redid ${action.description}`);
  }, [redoStack]);

  // --- Copy / Paste Logic ---

  const handleCopy = (ids: string[]) => {
      if (ids.length === 0) return;
      setClipboard({ ids, op: 'COPY' });
      setContextMenu(null);
      showNotification(`Copied ${ids.length} item(s)`);
  };

  // Helper to recursively copy a folder and its content
  const copyItemRecursively = useCallback((itemId: string, newParentId: string, isRootOfCopy: boolean): FileSystemItem[] => {
      const item = files.find(f => f.id === itemId);
      if (!item) return [];

      const newId = uuidv4();
      let newName = item.name;

      // If this is the top-level item being pasted, check for name collisions in the target folder
      if (isRootOfCopy) {
          const siblings = files.filter(f => f.parentId === newParentId);
          let counter = 1;
          let candidateName = item.name;
          
          // Simple collision logic: File.txt -> File copy.txt -> File copy 2.txt
          while (siblings.some(f => f.name === candidateName)) {
              const dotIndex = item.name.lastIndexOf('.');
              if (dotIndex > 0) {
                  const namePart = item.name.substring(0, dotIndex);
                  const extPart = item.name.substring(dotIndex);
                  candidateName = `${namePart} copy${counter > 1 ? ` ${counter}` : ''}${extPart}`;
              } else {
                  candidateName = `${item.name} copy${counter > 1 ? ` ${counter}` : ''}`;
              }
              counter++;
          }
          newName = candidateName;
      }

      // Determine position: if root desktop, offset slightly. If folder, let standard ordering handle it.
      let newPosition = undefined;
      if (newParentId === 'root' && item.position) {
          newPosition = { x: item.position.x + 20, y: item.position.y + 20 };
      }

      const newItem: FileSystemItem = {
          ...item,
          id: newId,
          parentId: newParentId,
          name: newName,
          dateModified: Date.now(),
          dateCreated: Date.now(),
          position: newPosition,
          visibleTo: item.visibleTo, // Inherit visibility? Or reset to default? Let's inherit.
          trashData: undefined // Clean trash data if copying from trash
      };

      let createdItems = [newItem];

      // If folder, recurse
      if (item.type === FileType.FOLDER) {
          const children = files.filter(f => f.parentId === itemId);
          children.forEach(child => {
              createdItems = [...createdItems, ...copyItemRecursively(child.id, newId, false)];
          });
      }

      return createdItems;
  }, [files]);

  const handlePaste = useCallback(() => {
      if (!clipboard || !clipboard.ids.length) return;

      // Determine target folder
      // 1. If Context Menu was clicked on a folder (handled via context logic passed to this func? No, simplified.)
      // 2. Use Active Finder Window
      // 3. Else Desktop ('root')
      
      let targetFolderId = 'root';
      const activeFinder = windows
          .filter(w => w.type === 'FINDER' && w.isOpen && !w.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex)[0];

      if (activeFinder) {
          targetFolderId = activeFinder.data.currentFolderId;
      }

      if (targetFolderId === TRASH_ID) {
          showNotification("Cannot paste into Trash", true);
          return;
      }
      if (targetFolderId.startsWith('tag:')) {
        showNotification("Cannot paste into Tags view", true);
        return;
      }

      // Check write permission on target
      if (targetFolderId !== 'root') {
          const folder = files.find(f => f.id === targetFolderId);
          if (folder && !hasPermission(folder)) {
              showPermissionError();
              return;
          }
      }

      let allNewItems: FileSystemItem[] = [];

      clipboard.ids.forEach(id => {
          const newItems = copyItemRecursively(id, targetFolderId, true);
          allNewItems = [...allNewItems, ...newItems];
      });

      if (allNewItems.length > 0) {
          setFiles(prev => [...prev, ...allNewItems]);
          
          commitAction({
              type: 'PASTE',
              description: `Paste ${clipboard.ids.length} item(s)`,
              payload: { newItems: allNewItems },
              timestamp: Date.now()
          });

          showNotification(`Pasted ${clipboard.ids.length} item(s)`);
      }
      setContextMenu(null);
  }, [clipboard, files, windows, copyItemRecursively, hasPermission]);

  // Global Keyboard Listeners
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Undo/Redo
          if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
              if (e.shiftKey) {
                  performRedo();
              } else {
                  performUndo();
              }
          }

          // Copy
          if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
              if (selectedFileIds.length > 0 && !renamingId) {
                  e.preventDefault();
                  handleCopy(selectedFileIds);
              }
          }

          // Paste
          if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
              if (!renamingId) {
                  e.preventDefault();
                  handlePaste();
              }
          }
          
          // Delete Key logic
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFileIds.length > 0 && !renamingId && !isSleep) {
              // Check if active element is an input/textarea
              const activeTag = document.activeElement?.tagName.toLowerCase();
              if (activeTag === 'input' || activeTag === 'textarea') return;

              handleMoveToTrash(selectedFileIds);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo, selectedFileIds, renamingId, isSleep, handlePaste]); // Added handlePaste to deps


  // --- Window Management ---
  const openWindow = (type: 'FINDER' | 'PREVIEW' | 'AI_CHAT' | 'SETTINGS' | 'INFO', data?: any) => {
    const existingSettings = type === 'SETTINGS' ? windows.find(w => w.type === 'SETTINGS') : null;
    if (existingSettings) {
        focusWindow(existingSettings.id);
        return;
    }

    const id = uuidv4();
    const isMobile = window.innerWidth < 768;
    const newWindow: WindowState = {
      id,
      title: type === 'FINDER' ? (data?.currentFolderId === TRASH_ID ? 'Trash' : 'Finder') : 
             type === 'SETTINGS' ? 'System Settings' : 
             type === 'INFO' ? `${data?.name || 'File'} Info` : 
             (data?.name || 'Info'),
      type,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: topZIndex + 1,
      position: { x: isMobile ? 0 : 100 + (windows.length * 30), y: isMobile ? 0 : 100 + (windows.length * 30) },
      size: type === 'AI_CHAT' ? { width: 400, height: 500 } : 
            type === 'SETTINGS' ? { width: isMobile ? window.innerWidth : 700, height: 500 } : 
            type === 'INFO' ? { width: 300, height: 500 } :
            { width: isMobile ? window.innerWidth : 800, height: 500 },
      data: data || { currentFolderId: 'root' }
    };
    setTopZIndex(prev => prev + 1);
    setWindows([...windows, newWindow]);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const focusWindow = (id: string) => {
    setTopZIndex(prev => prev + 1);
    setWindows(windows.map(w => w.id === id ? { ...w, zIndex: topZIndex + 1 } : w));
  };

  const updateWindowData = (id: string, data: any) => {
    setWindows(windows.map(w => w.id === id ? { 
        ...w, 
        data: { ...w.data, ...data },
        title: data.currentFolderId === TRASH_ID ? 'Trash' : (w.type === 'FINDER' ? 'Finder' : w.title)
    } : w));
  };

  const handleWindowResize = (id: string, newSize: { width: number, height: number }, newPosition: { x: number, y: number }) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, size: newSize, position: newPosition } : w));
  };

  // --- File System Logic ---
  const getPath = (folderId: string): FileSystemItem[] => {
    // Handle Tag Views as virtual paths
    if (folderId.startsWith('tag:')) return [];
    if (folderId === TRASH_ID) return [{ id: TRASH_ID, parentId: null, name: 'Trash', type: FileType.FOLDER, dateModified: Date.now(), order: 0, visibleTo: [], tags: [] }];

    const path: FileSystemItem[] = [];
    let current = files.find(f => f.id === folderId);
    while (current) {
      path.unshift(current);
      if (!current.parentId || current.parentId === TRASH_ID) break; // Don't traverse up from Trash
      current = files.find(f => f.id === current?.parentId);
    }
    return path;
  };

  const getPathString = (parentId: string | null): string => {
      if (!parentId) return "UR System"; 
      if (parentId === 'root') return "UR System";
      if (parentId === TRASH_ID) return "Trash Bin";
      
      const path = getPath(parentId);
      return "UR System › " + path.map(p => p.name).join(' › ');
  };

  const handleRenameConfirm = (id: string, newName: string) => {
      const file = files.find(f => f.id === id);
      if (!file) return;
      if (file.parentId === TRASH_ID) return; // Cannot rename in trash

      if (!hasPermission(file)) {
          showPermissionError();
          setRenamingId(null);
          return;
      }

      if (newName.trim() && file.name !== newName.trim()) {
          const oldName = file.name;
          const cleanName = newName.trim();
          
          setFiles(prev => prev.map(f => f.id === id ? { ...f, name: cleanName, dateModified: Date.now() } : f));
          
          commitAction({
              type: 'RENAME',
              description: 'Rename',
              payload: { id, oldName, newName: cleanName },
              timestamp: Date.now()
          });
      }
      setRenamingId(null);
  };

  const handleDownload = (item: FileSystemItem) => {
    if (!hasPermission(item)) {
        showPermissionError();
        return;
    }
    setContextMenu(null);
    setDownloadingId(item.id);
    
    let loaded = 0;
    const interval = setInterval(() => {
        loaded += 5;
        setOpProgress({
            type: 'DOWNLOAD',
            fileName: item.name,
            progress: loaded,
            speed: '12 MB/s'
        });
        if (loaded >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setOpProgress(null);
              setDownloadingId(null);
            }, 1000);
        }
    }, 100);
  };

  const handleUpload = (fileList: FileList, targetFolderId: string) => {
    if (targetFolderId === TRASH_ID) {
        showNotification("Cannot upload directly to Trash", true);
        return;
    }
    // Check if user can write to the target folder
    if(targetFolderId !== 'root') {
        const folder = files.find(f => f.id === targetFolderId);
        if (folder && !hasPermission(folder)) {
            showPermissionError();
            return;
        }
    }

    const totalSize = Array.from(fileList).reduce((acc, f) => acc + f.size, 0);
    let loaded = 0;
    const folderItems = files.filter(f => f.parentId === targetFolderId);
    const maxOrder = folderItems.length > 0 ? Math.max(...folderItems.map(f => f.order)) : 0;

    const interval = setInterval(() => {
        loaded += totalSize / 20;
        const progress = Math.min((loaded / totalSize) * 100, 100);
        setOpProgress({
            type: 'UPLOAD',
            fileName: fileList[0].name + (fileList.length > 1 ? ` (+${fileList.length-1})` : ''),
            progress,
            speed: '45 MB/s'
        });

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => setOpProgress(null), 1000);
            
            const newFiles: FileSystemItem[] = Array.from(fileList).map((f, idx) => ({
                id: uuidv4(),
                parentId: targetFolderId,
                name: f.name,
                type: f.type.startsWith('image') ? FileType.IMAGE : f.type.startsWith('video') ? FileType.VIDEO : f.type.startsWith('text') ? FileType.TEXT : FileType.UNKNOWN,
                size: f.size,
                dateModified: Date.now(),
                dateCreated: Date.now(),
                order: maxOrder + 1 + idx,
                visibleTo: [UserRole.USER, UserRole.JUNIOR], // Default visibility for new files
                ownerId: currentUser!.id,
                tags: []
            }));
            
            setFiles(prev => [...prev, ...newFiles]);
            
            newFiles.forEach(f => {
                commitAction({
                    type: 'CREATE',
                    description: 'Upload',
                    payload: { id: f.id, item: f },
                    timestamp: Date.now()
                });
            });
        }
    }, 100);
  };

  const handleMoveFile = (sourceId: string, targetFolderId: string, newPosition?: {x: number, y: number}) => {
      if (sourceId === targetFolderId) return;

      const sourceFile = files.find(f => f.id === sourceId);
      if (sourceFile && !hasPermission(sourceFile)) {
          showPermissionError();
          return;
      }
      // Special handling if moving TO trash folder via drag and drop
      if (targetFolderId === TRASH_ID) {
          handleMoveToTrash([sourceId]);
          return;
      }

      if (targetFolderId !== 'root') {
          const targetFolder = files.find(f => f.id === targetFolderId);
          if (targetFolder && !hasPermission(targetFolder)) {
              showPermissionError();
              return;
          }
      }

      let current = files.find(f => f.id === targetFolderId);
      while (current) {
          if (current.id === sourceId) return;
          if (!current.parentId) break;
          current = files.find(f => f.id === current?.parentId);
      }

      const idsToMove = selectedFileIds.includes(sourceId) 
          ? [...new Set([...selectedFileIds, sourceId])] 
          : [sourceId];

      const targetItems = files.filter(f => f.parentId === targetFolderId);
      let maxOrder = targetItems.length > 0 ? Math.max(...targetItems.map(f => f.order)) : 0;
      
      const movedItemsPayload: any[] = [];

      setFiles(prev => {
          return prev.map(f => {
              if (idsToMove.includes(f.id)) {
                  if (f.parentId === targetFolderId && !newPosition) return f; 
                  maxOrder++;
                  
                  movedItemsPayload.push({
                      id: f.id,
                      oldParentId: f.parentId,
                      oldOrder: f.order,
                      oldPosition: f.position,
                      newParentId: targetFolderId,
                      newOrder: maxOrder,
                      newPosition: newPosition 
                  });

                  const position = newPosition;

                  return { ...f, parentId: targetFolderId, dateModified: Date.now(), order: maxOrder, position };
              }
              return f;
          });
      });

      if (movedItemsPayload.length > 0) {
          commitAction({
              type: 'MOVE',
              description: `Move ${movedItemsPayload.length} item${movedItemsPayload.length > 1 ? 's' : ''}`,
              payload: { items: movedItemsPayload },
              timestamp: Date.now()
          });
      }
  };

  const handleReposition = (id: string, newPosition: { x: number, y: number }) => {
      const file = files.find(f => f.id === id);
      if (!file) return;
      if (!hasPermission(file)) return; // Strictly, if you can't see it you can't move it anyway

      const oldPosition = file.position;

      setFiles(prev => prev.map(f => f.id === id ? { ...f, position: newPosition } : f));

      commitAction({
          type: 'REPOSITION',
          description: 'Reposition',
          payload: { id, oldPosition, newPosition },
          timestamp: Date.now()
      });
  };

  const handleDesktopDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('application/react-finder-id');
      if (!sourceId) return;

      const offsetX = parseInt(e.dataTransfer.getData('application/offset-x') || '0', 10);
      const offsetY = parseInt(e.dataTransfer.getData('application/offset-y') || '0', 10);
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      const file = files.find(f => f.id === sourceId);
      if (!file) return;

      if (file.parentId === 'root') {
          handleReposition(sourceId, { x, y });
      } else {
          handleMoveFile(sourceId, 'root', { x, y });
      }
  };

  const handleSwapFile = (sourceId: string, targetId: string) => {
    const sourceFile = files.find(f => f.id === sourceId);
    const targetFile = files.find(f => f.id === targetId);

    if (!sourceFile || !targetFile) return;
    if (!hasPermission(sourceFile) || !hasPermission(targetFile)) {
        showPermissionError();
        return;
    }

    const sourceOrder = sourceFile.order;
    const targetOrder = targetFile.order;

    commitAction({
        type: 'SWAP',
        description: 'Reorder',
        payload: { 
            sourceId, 
            targetId, 
            sourceOldOrder: sourceOrder, 
            targetOldOrder: targetOrder,
            sourceNewOrder: targetOrder,
            targetNewOrder: sourceOrder
        },
        timestamp: Date.now()
    });

    setFiles(prev => {
        return prev.map(f => {
            if (f.id === sourceId) return { ...f, order: targetOrder };
            if (f.id === targetId) return { ...f, order: sourceOrder };
            return f;
        });
    });
  };

  // --- TRASH LOGIC ---

  const handleMoveToTrash = (itemIds: string[]) => {
      const itemsToTrash = files.filter(f => itemIds.includes(f.id));
      
      // Check permissions
      if (itemsToTrash.some(f => !hasPermission(f))) {
          showPermissionError();
          return;
      }

      setFiles(prev => prev.map(f => {
          if (itemIds.includes(f.id)) {
              return {
                  ...f,
                  parentId: TRASH_ID,
                  position: undefined, // Reset position in trash
                  trashData: {
                      originalParentId: f.parentId,
                      dateTrashed: Date.now()
                  }
              };
          }
          return f;
      }));

      commitAction({
          type: 'TRASH',
          description: `Move ${itemIds.length} item(s) to Trash`,
          payload: { ids: itemIds },
          timestamp: Date.now()
      });

      setContextMenu(null);
      setSelectedFileIds([]);
      showNotification(`${itemIds.length} item(s) moved to Trash`);
  };

  const handleRestoreFile = (itemIds: string[]) => {
      setFiles(prev => prev.map(f => {
          if (itemIds.includes(f.id)) {
              return {
                  ...f,
                  parentId: f.trashData?.originalParentId || 'root', // Default to root if origin lost
                  trashData: undefined
              };
          }
          return f;
      }));
      
      commitAction({
          type: 'RESTORE',
          description: `Restore ${itemIds.length} item(s)`,
          payload: { ids: itemIds },
          timestamp: Date.now()
      });

      setContextMenu(null);
      setSelectedFileIds([]);
      showNotification(`${itemIds.length} item(s) restored`);
  };

  const handlePermanentDelete = (itemIds: string[]) => {
      const filesToDelete = files.filter(f => itemIds.includes(f.id));
      
      commitAction({
          type: 'DELETE',
          description: `Permanently delete ${filesToDelete.length} item(s)`,
          payload: { files: filesToDelete },
          timestamp: Date.now()
      });

      setFiles(prev => prev.filter(f => !itemIds.includes(f.id)));
      setContextMenu(null);
      setSelectedFileIds([]);
      showNotification("Files permanently deleted");
  };

  const handleEmptyTrash = () => {
      const trashFiles = files.filter(f => f.parentId === TRASH_ID);
      if (trashFiles.length === 0) return;

      const trashIds = trashFiles.map(f => f.id);
      handlePermanentDelete(trashIds);
      showNotification("Trash emptied");
  };

  const handleDockDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId = e.dataTransfer.getData('application/react-finder-id');
      if (sourceId) {
          handleMoveToTrash([sourceId]);
      }
  };

  const handleOpenFile = (item: FileSystemItem) => {
    if (!hasPermission(item)) {
        showPermissionError();
        return;
    }
    if (item.parentId === TRASH_ID && item.type !== FileType.FOLDER) {
        showNotification("Restore file to open it.", true);
        return;
    }

    if (item.type === FileType.FOLDER) {
      const activeWindow = windows.find(w => w.zIndex === topZIndex && w.type === 'FINDER');
      if (activeWindow) {
        updateWindowData(activeWindow.id, { currentFolderId: item.id });
      } else {
        openWindow('FINDER', { currentFolderId: item.id });
      }
    } else {
      openWindow('PREVIEW', item);
    }
  };

  const handleGetInfo = (itemId: string) => {
      const item = files.find(f => f.id === itemId);
      if (item) {
          if (!hasPermission(item)) {
              showPermissionError();
              return;
          }
          openWindow('INFO', item);
      }
      setContextMenu(null);
  };

  const handleMenuGetInfo = () => {
      if (selectedFileIds.length > 0) {
          selectedFileIds.forEach(id => handleGetInfo(id));
      } else {
          const activeFinder = windows
            .filter(w => w.type === 'FINDER' && w.isOpen && !w.isMinimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
          
          if (activeFinder) {
              handleGetInfo(activeFinder.data.currentFolderId);
          } else {
              handleGetInfo('root');
          }
      }
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string | null) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, itemId });
  };

  const handleNewFolderAction = () => {
      const activeFinder = windows
        .filter(w => w.type === 'FINDER' && !w.isMinimized && w.isOpen)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      
      const targetParentId = activeFinder ? activeFinder.data.currentFolderId : 'root';
      
      if (targetParentId === TRASH_ID) {
          showNotification("Cannot create folders in Trash", true);
          return;
      }
      // Prevent Creating folders in Tag Views
      if (targetParentId.startsWith('tag:')) {
          showNotification("Cannot create folders in Tag view", true);
          return;
      }

      if (targetParentId !== 'root') {
          const folder = files.find(f => f.id === targetParentId);
          if (folder && !hasPermission(folder)) {
              showPermissionError();
              return;
          }
      }

      const parentName = activeFinder ? 'Finder' : 'Desktop';

      // Generate unique name for Untitled Folder
      let baseName = 'Untitled Folder';
      let finalName = baseName;
      let counter = 2;
      
      // Check existing files in the same directory to avoid duplicates
      const siblings = files.filter(f => f.parentId === targetParentId);
      while (siblings.some(f => f.name === finalName)) {
          finalName = `${baseName} ${counter}`;
          counter++;
      }

      const newFolder: FileSystemItem = {
            id: uuidv4(),
            parentId: targetParentId,
            name: finalName,
            type: FileType.FOLDER,
            dateModified: Date.now(),
            dateCreated: Date.now(),
            order: 1000, 
            position: targetParentId === 'root' ? { x: 200, y: 200 } : undefined,
            visibleTo: [UserRole.USER, UserRole.JUNIOR],
            ownerId: currentUser!.id,
            tags: []
      };
      setFiles(prev => [...prev, newFolder]);
      commitAction({ type: 'CREATE', description: 'New Folder', payload: { id: newFolder.id, item: newFolder }, timestamp: Date.now() });
      setRenamingId(newFolder.id);
      showNotification(`Created folder in ${parentName}`);
  }

  const handleAnalyzeFile = async (item: FileSystemItem) => {
      setContextMenu(null);
      if (!hasPermission(item)) {
          showPermissionError();
          return;
      }
      if (item.type !== FileType.TEXT) {
          alert("AI Analysis currently supports Text files only.");
          return;
      }
      openWindow('AI_CHAT', { ...item, mode: 'summary' });
  };

  const getIconPosition = (item: FileSystemItem, index: number) => {
      if (item.position) return item.position;
      
      const screenW = windowSize.w;
      const isMobile = screenW < 768;

      if (isMobile) {
          // Grid Layout for mobile (Top Left flow)
          const cols = 4; // Adjust based on typical mobile width if needed
          const col = index % cols;
          const row = Math.floor(index / cols);
          return { x: 20 + (col * 80), y: 60 + (row * 90) }; // Top-down grid with padding
      } else {
          // Desktop Layout (Right Side column)
          const col = Math.floor(index / 6); 
          const row = index % 6;
          const startX = screenW - 120;
          const startY = 40; 
          return { x: startX - (col * 110), y: startY + (row * 110) };
      }
  };

  const desktopIcons = useMemo(() => {
      // Filter visually based on permissions
      return visibleFiles
        .filter(f => f.parentId === 'root' && f.id !== 'root')
        .sort((a, b) => a.order - b.order);
  }, [visibleFiles, windowSize]); // Re-calc on window resize

  // Context Menu Item Renderer Helper
  const getContextItem = (itemId: string) => {
      return files.find(f => f.id === itemId);
  }

  // If not logged in, show login screen
  if (!currentUser) {
      return <LoginScreen onLogin={setCurrentUser} wallpaper={wallpaper} users={users} />;
  }

  return (
    <div 
        className={`w-screen h-screen overflow-hidden bg-cover bg-center relative font-sans select-none ${theme}`}
        style={{ backgroundImage: `url(${wallpaper})` }}
        onClick={() => {
            setContextMenu(null);
            setSelectedFileIds([]);
            if (renamingId) setRenamingId(null);
        }}
        onContextMenu={(e) => handleContextMenu(e, null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDesktopDrop}
    >
      <MenuBar 
        onOpenSettings={() => openWindow('SETTINGS')}
        onRestart={() => setCurrentUser(null)} // Logout
        onSleep={() => setIsSleep(true)}
        onNewWindow={() => openWindow('FINDER')}
        onNewFolder={handleNewFolderAction}
        onGetInfo={handleMenuGetInfo}
        onUndo={performUndo}
        onRedo={performRedo}
        onCopy={() => handleCopy(selectedFileIds)}
        onPaste={() => handlePaste()}
        undoDisabled={undoStack.length === 0}
        redoDisabled={redoStack.length === 0}
        copyDisabled={selectedFileIds.length === 0}
        pasteDisabled={!clipboard || clipboard.ids.length === 0}
        isDark={theme === 'dark'}
        toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />
      
      {/* Notification Toast */}
      <div className={`fixed top-12 right-4 z-[200] transition-all duration-300 transform ${notification && notification.visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          {notification && (
            <div className={`backdrop-blur-md border shadow-lg rounded-lg px-4 py-3 flex items-center space-x-3 max-w-xs ${notification.isError ? 'bg-red-100/90 dark:bg-red-900/90 border-red-200 dark:border-red-800' : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700'}`}>
                <div className={`p-1.5 rounded-full ${notification.isError ? 'bg-red-200 dark:bg-red-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {notification.isError ? <Lock className="w-4 h-4 text-red-600 dark:text-red-200"/> : <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
                </div>
                <div>
                    <p className={`text-sm font-medium ${notification.isError ? 'text-red-800 dark:text-red-100' : 'text-gray-800 dark:text-gray-200'}`}>{notification.msg}</p>
                </div>
            </div>
          )}
      </div>
      
      {/* Sleep Overlay */}
      {isSleep && (
          <div 
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center cursor-none"
            onClick={() => setIsSleep(false)}
            onKeyDown={() => setIsSleep(false)}
            tabIndex={0}
            autoFocus
            ref={(el) => el?.focus()}
          >
             <div className="animate-pulse text-gray-800">
                <span className="text-6xl"></span>
             </div>
             <div className="absolute bottom-10 text-gray-600 text-sm">Click or Press any key to wake</div>
          </div>
      )}

      {/* Desktop Icons Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none"> 
         {desktopIcons.map((item, index) => {
             const pos = getIconPosition(item, index);
             return (
                 <div 
                    key={item.id}
                    className="absolute pointer-events-auto"
                    style={{ left: pos.x, top: pos.y }}
                 >
                     <FileIconWrapper 
                        item={item} 
                        selected={selectedFileIds.includes(item.id)}
                        onSelect={(id, multi) => {
                            if(multi) setSelectedFileIds(prev => [...prev, id]);
                            else setSelectedFileIds([id]);
                        }}
                        onOpen={handleOpenFile}
                        onContext={(e) => handleContextMenu(e, item.id)}
                        onMove={handleMoveFile}
                        onSwap={handleSwapFile}
                        isRenaming={renamingId === item.id}
                        onRenameStart={(id) => {
                            if(hasPermission(item)) setRenamingId(id);
                            else showPermissionError();
                        }}
                        onRenameConfirm={handleRenameConfirm}
                        onRenameCancel={() => setRenamingId(null)}
                        isLoading={downloadingId === item.id}
                     />
                 </div>
             );
         })}
      </div>

      {/* Windows */}
      {windows.map(win => (
        <Window
          key={win.id}
          window={win}
          onFocus={() => focusWindow(win.id)}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => setWindows(windows.map(w => w.id === win.id ? { ...w, isMinimized: true } : w))}
          onMaximize={() => setWindows(windows.map(w => w.id === win.id ? { ...w, isMaximized: !w.isMaximized } : w))}
          onResize={(newSize, newPos) => handleWindowResize(win.id, newSize, newPos)}
        >
          {win.type === 'FINDER' && (
            <FinderWindow
              currentFolderId={win.data.currentFolderId}
              items={visibleFiles} // ONLY PASS VISIBLE FILES
              selectedItemIds={selectedFileIds}
              path={getPath(win.data.currentFolderId)}
              onNavigate={(fid) => {
                  // Allow navigation to Root, Permissioned Folders, Tag Views, or TRASH
                  const folder = files.find(f => f.id === fid);
                  if (fid === 'root' || fid === TRASH_ID || fid.startsWith('tag:') || (folder && hasPermission(folder))) {
                      updateWindowData(win.id, { currentFolderId: fid });
                  } else {
                      showPermissionError();
                  }
              }}
              onSelect={(id, multi) => {
                  if (id === '') setSelectedFileIds([]);
                  else if (multi) setSelectedFileIds(prev => [...prev, id]);
                  else setSelectedFileIds([id]);
              }}
              onOpenFile={handleOpenFile}
              onGoBack={() => {
                 if (win.data.currentFolderId.startsWith('tag:') || win.data.currentFolderId === TRASH_ID) {
                     updateWindowData(win.id, { currentFolderId: 'root' });
                     return;
                 }

                 const current = files.find(f => f.id === win.data.currentFolderId);
                 if(current?.parentId) updateWindowData(win.id, { currentFolderId: current.parentId });
              }}
              onUpload={(fl) => handleUpload(fl, win.data.currentFolderId)}
              onMoveFile={handleMoveFile}
              onReposition={handleReposition}
              onSwapFile={handleSwapFile}
              opProgress={opProgress}
              renamingId={renamingId}
              onRenameStart={(id) => {
                  const item = files.find(f => f.id === id);
                  if(item && hasPermission(item)) setRenamingId(id);
                  else showPermissionError();
              }}
              onRenameConfirm={handleRenameConfirm}
              onRenameCancel={() => setRenamingId(null)}
              downloadingId={downloadingId}
              onContextMenu={(e, itemId) => handleContextMenu(e, itemId)}
              onEmptyTrash={handleEmptyTrash}
              onRestore={(id) => handleRestoreFile(id ? [id] : selectedFileIds)}
              onPermanentDelete={(id) => handlePermanentDelete(id ? [id] : selectedFileIds)}
            />
          )}
          {win.type === 'PREVIEW' && (
              <FilePreview 
                item={win.data} 
                onAnalyze={() => handleAnalyzeFile(win.data)}
              />
          )}
          {win.type === 'AI_CHAT' && (
              <AIChatWindow item={win.data} />
          )}
          {win.type === 'SETTINGS' && (
              <SettingsWindow 
                theme={theme} 
                setTheme={setTheme}
                wallpaper={wallpaper}
                setWallpaper={setWallpaper}
                currentUser={currentUser}
                users={users}
                onUpdateUser={handleUpdateUser}
              />
          )}
          {win.type === 'INFO' && (
              <InfoWindow 
                item={win.data}
                path={getPathString(win.data.parentId)}
                onRename={handleRenameConfirm}
                onClose={() => closeWindow(win.id)}
                currentUserRole={currentUser.role}
                onUpdateVisibility={(visibleTo) => updateVisibility(win.data.id, visibleTo)}
                onUpdateTags={(tags) => updateTags(win.data.id, tags)}
              />
          )}
        </Window>
      ))}

      <Dock 
        onOpenFinder={() => openWindow('FINDER')} 
        onOpenSettings={() => openWindow('SETTINGS')}
        onOpenTrash={() => openWindow('FINDER', { currentFolderId: TRASH_ID })}
        onDrop={(e) => handleDockDrop(e)}
      />
      
      {/* Global Progress Dialog */}
      {opProgress && <ProgressDialog progress={opProgress} />}

      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="absolute bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-[100] w-56"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
             {contextMenu.itemId ? (
                 (() => {
                    const item = files.find(f => f.id === contextMenu.itemId);
                    const isTrashed = item?.parentId === TRASH_ID;
                    
                    return (
                        <>
                            {isTrashed ? (
                                <>
                                    <ContextMenuItem label="Put Back" icon={Reply} onClick={() => {
                                        handleRestoreFile([contextMenu.itemId!]);
                                        setContextMenu(null);
                                    }} />
                                    <ContextMenuItem label="Delete Immediately" icon={Trash} onClick={() => {
                                        handlePermanentDelete([contextMenu.itemId!]);
                                        setContextMenu(null);
                                    }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" />
                                </>
                            ) : (
                                <>
                                    <ContextMenuItem label="Open" onClick={() => {
                                        if(item) handleOpenFile(item);
                                        setContextMenu(null);
                                    }} />
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                    
                                    <ContextMenuItem label="Copy" icon={Copy} onClick={() => {
                                        if(contextMenu.itemId) handleCopy([contextMenu.itemId]);
                                    }} />
                                    
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>

                                    <ContextMenuItem label="Rename" icon={Edit2} onClick={() => {
                                        if(item && hasPermission(item)) setRenamingId(contextMenu.itemId);
                                        else showPermissionError();
                                        setContextMenu(null);
                                    }} />
                                    <ContextMenuItem label="Get Info" icon={Info} onClick={() => {
                                        if (contextMenu.itemId) handleGetInfo(contextMenu.itemId);
                                    }} />
                                    
                                    {/* Admin Visibility Quick Controls */}
                                    {currentUser.role === UserRole.ADMIN && (() => {
                                        if (!item) return null;
                                        return (
                                            <>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                                <div className="px-4 py-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    Visibility {selectedFileIds.length > 1 && '(Batch)'}
                                                </div>
                                                <ContextMenuItem 
                                                    label="Visible to User" 
                                                    icon={item.visibleTo.includes(UserRole.USER) ? Check : undefined} 
                                                    onClick={() => handleVisibilityToggle(item.id, UserRole.USER)}
                                                    className={item.visibleTo.includes(UserRole.USER) ? "text-blue-600 font-medium" : ""}
                                                />
                                                <ContextMenuItem 
                                                    label="Visible to Junior" 
                                                    icon={item.visibleTo.includes(UserRole.JUNIOR) ? Check : undefined} 
                                                    onClick={() => handleVisibilityToggle(item.id, UserRole.JUNIOR)}
                                                    className={item.visibleTo.includes(UserRole.JUNIOR) ? "text-blue-600 font-medium" : ""}
                                                />
                                            </>
                                        )
                                    })()}

                                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                    <ContextMenuItem label="Download" icon={DownloadIcon} onClick={() => {
                                        if (item) handleDownload(item);
                                    }} />
                                    <ContextMenuItem label="Sparkles Analysis" icon={Sparkles} onClick={() => {
                                        if(item) handleAnalyzeFile(item);
                                    }} />
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                    <ContextMenuItem label="Move to Trash" icon={Trash} onClick={() => {
                                        if(contextMenu.itemId) handleMoveToTrash([contextMenu.itemId]);
                                    }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" />
                                </>
                            )}
                        </>
                    );
                 })()
             ) : (
                 <>
                    <ContextMenuItem label="New Folder" onClick={() => {
                        handleNewFolderAction(); 
                        setContextMenu(null);
                    }} />
                    
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                    <ContextMenuItem label="Paste" icon={Clipboard} onClick={() => {
                         handlePaste();
                    }} disabled={!clipboard || clipboard.ids.length === 0} />
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>

                    <ContextMenuItem label="Get Info" onClick={() => {
                         handleGetInfo('root');
                         setContextMenu(null);
                    }} />
                    <ContextMenuItem label="Change Wallpaper" onClick={() => {
                        openWindow('SETTINGS');
                        setContextMenu(null);
                    }} />
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                     <ContextMenuItem 
                        label="Undo" 
                        icon={RotateCcw}
                        onClick={() => {
                            performUndo();
                            setContextMenu(null);
                        }} 
                        disabled={undoStack.length === 0}
                        className={undoStack.length === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                    />
                    <ContextMenuItem 
                        label="Redo" 
                        icon={RotateCw}
                        onClick={() => {
                            performRedo();
                            setContextMenu(null);
                        }} 
                        disabled={redoStack.length === 0}
                        className={redoStack.length === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                    />
                 </>
             )}
          </div>
      )}
    </div>
  );
};

const FileIconWrapper: React.FC<{
    item: FileSystemItem, 
    selected: boolean, 
    onSelect: (id: string, multi: boolean) => void, 
    onOpen: (item: FileSystemItem) => void, 
    onContext: (e: React.MouseEvent) => void,
    onMove: (s: string, t: string) => void,
    onSwap: (s: string, t: string) => void,
    isRenaming: boolean,
    onRenameStart: (id: string) => void,
    onRenameConfirm: (id: string, newName: string) => void,
    onRenameCancel: () => void,
    isLoading?: boolean
}> = ({ onOpen, onContext, ...props }) => (
    <div onContextMenu={onContext} className="relative group text-white text-shadow-sm">
        <FileIcon 
            {...props}
            onDoubleClick={onOpen}
            className="text-white"
        />
    </div>
);

const ContextMenuItem: React.FC<{label: string, onClick: () => void, className?: string, icon?: any, disabled?: boolean}> = ({label, onClick, className, icon: Icon, disabled}) => (
    <button 
        className={`w-full text-left px-4 py-1.5 text-sm flex items-center justify-between transition-colors group ${disabled ? 'opacity-50 cursor-default' : 'hover:bg-blue-500 hover:text-white'} ${className || 'text-gray-700 dark:text-gray-200'}`}
        onClick={(e) => { 
            e.stopPropagation(); 
            if(!disabled) onClick(); 
        }}
        disabled={disabled}
    >
        <span>{label}</span>
        {Icon && <Icon className="w-3 h-3 ml-2 text-blue-500 group-hover:text-white" />}
    </button>
);

const FilePreview: React.FC<{item: FileSystemItem, onAnalyze: () => void}> = ({ item, onAnalyze }) => (
    <div className="p-6 flex flex-col items-center h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex-1 flex items-center justify-center w-full">
            {item.type === FileType.IMAGE ? (
               <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                   [Image Preview: {item.name}]
               </div>
            ) : (
               <div className="bg-white dark:bg-gray-800 p-8 shadow-sm border border-gray-200 dark:border-gray-700 rounded w-full h-full overflow-auto whitespace-pre-wrap font-mono text-sm">
                   {item.content || "No preview available."}
               </div>
            )}
        </div>
        <div className="mt-4 flex space-x-4 w-full justify-center">
            <button 
                onClick={onAnalyze}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:shadow-lg transition-all"
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Ask Gemini
            </button>
        </div>
    </div>
);

const AIChatWindow: React.FC<{item: FileSystemItem}> = ({ item }) => {
    const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const initialized = React.useRef(false);

    useEffect(() => {
        if (!initialized.current && item.content) {
            initialized.current = true;
            setLoading(true);
            summarizeFileContent(item.name, item.content).then(summary => {
                setMessages([{role: 'ai', text: `Here is a summary of ${item.name}:\n\n${summary}`}]);
                setLoading(false);
            });
        }
    }, [item]);

    const handleSend = async () => {
        if(!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
        setInput('');
        setLoading(true);
        
        const response = await askAI(userMsg, item.content);
        setMessages(prev => [...prev, {role: 'ai', text: response}]);
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700'
                        }`}>
                            {m.text.split('\n').map((line, idx) => <div key={idx}>{line}</div>)}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-pulse">
                         <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl shadow-sm flex items-center space-x-2 border border-gray-100 dark:border-gray-700">
                            <Sparkles className="w-4 h-4 text-blue-500 animate-spin-slow" />
                            <span className="text-xs text-gray-500 font-medium">Gemini is thinking...</span>
                         </div>
                    </div>
                )}
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <input 
                        type="text" 
                        className="w-full pl-4 pr-10 py-2 rounded-full bg-gray-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Ask about this file..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} className="absolute right-2 top-1.5 p-1 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors">
                        <Sparkles className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;