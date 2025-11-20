
export enum FileType {
  FOLDER = 'FOLDER',
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  PDF = 'PDF',
  CODE = 'CODE',
  ARCHIVE = 'ARCHIVE',
  SHEET = 'SHEET',
  UNKNOWN = 'UNKNOWN'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  JUNIOR = 'JUNIOR'
}

export enum LabRole {
  SOFTWARE = 'Software Engineer',
  ELECTRICAL = 'Electronics Engineer',
  MECHANICAL = 'Mechanical Engineer',
  PR = 'Public Relations',
  LEAD = 'Team Lead',
  RESEARCH = 'Researcher',
  GENERAL = 'Member'
}

export interface User {
  id: string;
  username: string;
  password?: string; 
  fullName: string;
  role: UserRole;
  labRole: LabRole | string;
  avatar?: string; // url or base64
  bio?: string;
}

export interface FileSystemItem {
  id: string;
  parentId: string | null; // null means root/desktop. 'trash' means trash bin.
  name: string;
  type: FileType;
  size?: number; // in bytes
  content?: string; // For text simulation
  dateModified: number;
  dateCreated?: number;
  colorTag?: string; // Legacy support
  tags: string[]; // Array of color codes
  order: number; // For visual ordering in grid views
  position?: { x: number; y: number }; // For free positioning on desktop
  visibleTo: UserRole[]; // Which roles can see this file. ADMIN always sees everything.
  ownerId?: string;
  
  // Trash Logic
  trashData?: {
      originalParentId: string | null;
      dateTrashed: number;
  };
}

export interface WindowState {
  id: string;
  title: string;
  type: 'FINDER' | 'PREVIEW' | 'SETTINGS' | 'AI_CHAT' | 'INFO';
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data?: any; // Extra data like current folder ID
}

export interface FileOperationProgress {
  type: 'UPLOAD' | 'DOWNLOAD';
  fileName: string;
  progress: number; // 0-100
  speed: string;
}

// Undo/Redo Types
export type ActionType = 'MOVE' | 'RENAME' | 'DELETE' | 'SWAP' | 'CREATE' | 'REPOSITION' | 'TAG' | 'TRASH' | 'RESTORE' | 'PASTE';

export interface HistoryAction {
  type: ActionType;
  description: string;
  payload: any;
  timestamp: number;
}
