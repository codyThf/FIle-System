
import { FileSystemItem, FileType, User, UserRole, LabRole } from './types';

export const APP_VERSION = '2.5.1 (UR Lab Edition)';
export const AUTHOR_NAME = 'Underwater Robotics Lab';

export const WALLPAPERS = [
  { name: "Sierra", url: "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop" },
  { name: "Midnight", url: "https://images.unsplash.com/photo-1504221507732-5246c045949b?q=80&w=2070&auto=format&fit=crop" },
  { name: "Abstract", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" },
  { name: "Nebula", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2022&auto=format&fit=crop" },
  { name: "Dunes", url: "https://images.unsplash.com/photo-1541125229071-7752db332c3d?q=80&w=2070&auto=format&fit=crop" }
];

export const DEFAULT_USERS: User[] = [
  { 
    id: 'u_admin', 
    username: 'admin',
    password: 'admin', 
    fullName: 'System Administrator', 
    role: UserRole.ADMIN,
    labRole: LabRole.LEAD,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
    bio: 'Lead systems architect for the UR Lab infrastructure. Responsible for server maintenance and access control.'
  },
  { 
    id: 'u_user', 
    username: 'user', 
    password: 'user',
    fullName: 'Standard User', 
    role: UserRole.USER,
    labRole: LabRole.SOFTWARE,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    bio: 'Focusing on autonomous navigation algorithms and computer vision processing for AUVs.' 
  },
  { 
    id: 'u_junior', 
    username: 'junior', 
    password: 'junior',
    fullName: 'Junior Intern', 
    role: UserRole.JUNIOR,
    labRole: LabRole.RESEARCH,
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop',
    bio: 'Assisting with data collection, sensor calibration, and pool testing documentation.' 
  }
];

// Visibility Helpers
const VISIBLE_ALL = [UserRole.USER, UserRole.JUNIOR]; // Admin is implicit
const VISIBLE_USER_ONLY = [UserRole.USER];
const VISIBLE_NONE = []; // Admin only

export const TAG_COLORS = [
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' },
  { id: 'green', label: 'Green', hex: '#22c55e' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'gray', label: 'Gray', hex: '#6b7280' },
];

export const INITIAL_FILES: FileSystemItem[] = [
  { id: 'root', parentId: null, name: 'UR System', type: FileType.FOLDER, dateModified: Date.now(), order: 0, visibleTo: VISIBLE_ALL, tags: [] },
  { id: 'docs', parentId: 'root', name: 'Documents', type: FileType.FOLDER, dateModified: Date.now(), order: 1, visibleTo: VISIBLE_ALL, tags: ['blue'] },
  { id: 'imgs', parentId: 'root', name: 'Images', type: FileType.FOLDER, dateModified: Date.now(), order: 2, visibleTo: VISIBLE_ALL, tags: [] },
  { id: 'proj', parentId: 'docs', name: 'Project Alpha', type: FileType.FOLDER, dateModified: Date.now(), order: 0, visibleTo: VISIBLE_ALL, tags: ['red'] },
  
  // Specific visibility examples
  { id: 'note1', parentId: 'docs', name: 'Meeting Notes.txt', type: FileType.TEXT, size: 1024, content: "Meeting regarding Q4 goals.", dateModified: Date.now(), order: 1, visibleTo: VISIBLE_ALL, tags: [] },
  { id: 'pic1', parentId: 'imgs', name: 'Wallpaper.jpg', type: FileType.IMAGE, size: 2500000, dateModified: Date.now(), order: 0, visibleTo: VISIBLE_ALL, tags: ['green'] },
  { id: 'mov1', parentId: 'root', name: 'Demo Reel.mp4', type: FileType.VIDEO, size: 450000000, dateModified: Date.now(), order: 3, visibleTo: VISIBLE_ALL, tags: [] },
  { id: 'readme', parentId: 'root', name: 'ReadMe.txt', type: FileType.TEXT, size: 500, content: "Welcome.", dateModified: Date.now(), order: 4, visibleTo: VISIBLE_ALL, tags: [] },
  
  // Restricted Files
  { id: 'script1', parentId: 'proj', name: 'main.tsx', type: FileType.CODE, size: 12000, content: "console.log('Hello World');", dateModified: Date.now(), order: 0, visibleTo: VISIBLE_USER_ONLY, tags: ['purple'] }, // Hidden from Junior
  { id: 'pdf1', parentId: 'docs', name: 'Confidential.pdf', type: FileType.PDF, size: 450000, dateModified: Date.now(), order: 2, visibleTo: VISIBLE_NONE, tags: ['red', 'gray'] }, // Admin Only
  { id: 'arch1', parentId: 'root', name: 'Backup.zip', type: FileType.ARCHIVE, size: 120000000, dateModified: Date.now(), order: 5, visibleTo: VISIBLE_NONE, tags: [] }, // Admin Only
  
  { id: 'audio1', parentId: 'root', name: 'Podcast_Ep1.mp3', type: FileType.AUDIO, size: 15000000, dateModified: Date.now(), order: 6, visibleTo: VISIBLE_ALL, tags: [] },
  { id: 'sheet1', parentId: 'docs', name: 'Budget_2025.xlsx', type: FileType.SHEET, size: 25000, dateModified: Date.now(), order: 3, visibleTo: VISIBLE_USER_ONLY, tags: [] }
];

export const WALLPAPER_URL = WALLPAPERS[0].url;