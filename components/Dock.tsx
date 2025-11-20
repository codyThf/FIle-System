import React, { useState } from 'react';
import { Folder, Settings, Trash } from 'lucide-react';

interface DockProps {
  onOpenFinder: () => void;
  onOpenSettings: () => void;
  onOpenTrash: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export const Dock: React.FC<DockProps> = ({ onOpenFinder, onOpenSettings, onOpenTrash, onDrop }) => {
  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-[60]">
      <div className="flex items-center space-x-2 md:space-x-3 px-4 py-2 md:px-6 md:py-3 
        bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl 
        border border-white/20 dark:border-gray-700 
        rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
        
        <DockItem icon={Folder} label="Explorer" onClick={onOpenFinder} />
        <div className="w-px h-5 md:h-6 bg-gray-400/20 mx-0.5 md:mx-1"></div>
        <DockItem icon={Settings} label="Settings" onClick={onOpenSettings} />
        <TrashDockItem icon={Trash} label="Trash" onClick={onOpenTrash} onDrop={onDrop} />
      </div>
    </div>
  );
};

const DockItem = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
  <div className="group relative flex flex-col items-center cursor-pointer transition-all hover:-translate-y-1 duration-200" onClick={onClick}>
     {/* Minimalist Tooltip */}
    <span className="absolute -top-10 px-2 py-1 bg-black/80 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm whitespace-nowrap pointer-events-none hidden md:block">
      {label}
    </span>
    
    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center 
        bg-white/80 dark:bg-gray-800/80 
        shadow-sm border border-white/50 dark:border-gray-600
        group-active:scale-95 transition-transform">
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-200" />
    </div>
  </div>
);

const TrashDockItem = ({ icon: Icon, label, onClick, onDrop }: { icon: any, label: string, onClick: () => void, onDrop: (e: React.DragEvent) => void }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDrop(e);
    };

    return (
        <div 
            className={`group relative flex flex-col items-center cursor-pointer transition-all duration-200 ${isDragOver ? 'scale-110' : 'hover:-translate-y-1'}`} 
            onClick={onClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <span className="absolute -top-10 px-2 py-1 bg-black/80 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm whitespace-nowrap pointer-events-none hidden md:block">
                {label}
            </span>
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center 
                bg-white/80 dark:bg-gray-800/80 
                shadow-sm border border-white/50 dark:border-gray-600
                ${isDragOver ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isDragOver ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`} />
            </div>
        </div>
    );
}