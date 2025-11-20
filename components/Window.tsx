import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { WindowState } from '../types';

interface WindowProps {
  window: WindowState;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onResize?: (newSize: { width: number, height: number }, newPosition: { x: number, y: number }) => void;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ 
  window: windowState, onFocus, onClose, onMinimize, onMaximize, onResize, children 
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeRef = useRef<{
    startX: number, 
    startY: number, 
    startWidth: number, 
    startHeight: number, 
    startLeft: number, 
    startTop: number,
    direction: string 
  } | null>(null);

  useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!windowState.isOpen || windowState.isMinimized) return null;

  const handleMouseDown = (direction: string) => (e: React.MouseEvent) => {
      if (windowState.isMaximized || !onResize || isMobile) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      
      resizeRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startWidth: windowState.size.width,
          startHeight: windowState.size.height,
          startLeft: windowState.position.x,
          startTop: windowState.position.y,
          direction
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current || !onResize) return;

      const { startX, startY, startWidth, startHeight, startLeft, startTop, direction } = resizeRef.current;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const MIN_WIDTH = 250;
      const MIN_HEIGHT = 150;

      if (direction.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
      }
      if (direction.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
      }
      if (direction.includes('w')) {
          const proposedWidth = startWidth - deltaX;
          if (proposedWidth >= MIN_WIDTH) {
              newWidth = proposedWidth;
              newX = startLeft + deltaX;
          } else {
               newWidth = MIN_WIDTH;
               newX = startLeft + (startWidth - MIN_WIDTH);
          }
      }
      if (direction.includes('n')) {
          const proposedHeight = startHeight - deltaY;
          if (proposedHeight >= MIN_HEIGHT) {
              newHeight = proposedHeight;
              newY = startTop + deltaY;
          } else {
              newHeight = MIN_HEIGHT;
              newY = startTop + (startHeight - MIN_HEIGHT);
          }
      }

      onResize(
          { width: newWidth, height: newHeight },
          { x: newX, y: newY }
      );
  };

  const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  };

  // On mobile, we force maximize dimensions regardless of state
  const isEffectiveMaximized = windowState.isMaximized || isMobile;

  return (
    <motion.div
      drag={!isResizing && !windowState.isMaximized && !isMobile}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: isEffectiveMaximized ? 0 : windowState.position.x, 
        y: isEffectiveMaximized ? 0 : windowState.position.y,
        width: isEffectiveMaximized ? '100vw' : windowState.size.width,
        height: isEffectiveMaximized ? (isMobile ? 'calc(100vh - 6rem)' : 'calc(100vh - 2.5rem)') : windowState.size.height,
        top: isEffectiveMaximized ? 40 : 0, // Offset for top bar
        left: isEffectiveMaximized ? 0 : 0,
      }}
      transition={{ duration: isResizing ? 0 : 0.2 }}
      className={`absolute rounded-lg shadow-2xl flex flex-col overflow-hidden
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl
        border border-white/20 dark:border-white/10 ring-1 ring-black/5`}
      style={{ zIndex: windowState.zIndex }}
      onMouseDown={onFocus}
      onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
      }}
    >
      {/* RESIZE HANDLES - Hidden on Mobile or Maximize */}
      {!isEffectiveMaximized && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 z-50 cursor-ns-resize" onMouseDown={handleMouseDown('n')}></div>
            <div className="absolute bottom-0 left-0 w-full h-1 z-50 cursor-ns-resize" onMouseDown={handleMouseDown('s')}></div>
            <div className="absolute top-0 left-0 h-full w-1 z-50 cursor-ew-resize" onMouseDown={handleMouseDown('w')}></div>
            <div className="absolute top-0 right-0 h-full w-1 z-50 cursor-ew-resize" onMouseDown={handleMouseDown('e')}></div>
            
            <div className="absolute top-0 left-0 w-3 h-3 z-50 cursor-nwse-resize" onMouseDown={handleMouseDown('nw')}></div>
            <div className="absolute top-0 right-0 w-3 h-3 z-50 cursor-nesw-resize" onMouseDown={handleMouseDown('ne')}></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 z-50 cursor-nesw-resize" onMouseDown={handleMouseDown('sw')}></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 z-50 cursor-nwse-resize" onMouseDown={handleMouseDown('se')}></div>
          </>
      )}

      {/* Window Header - Minimalist Glass */}
      <div 
        className="h-10 flex items-center justify-between px-4 shrink-0 select-none
        border-b border-gray-200/30 dark:border-white/5
        bg-white/30 dark:bg-white/5 backdrop-blur-md"
        onDoubleClick={!isMobile ? onMaximize : undefined}
      >
        {/* Title Area */}
        <div className="flex-1 flex items-center overflow-hidden mr-4">
             <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate opacity-90">
               {windowState.title}
             </span>
        </div>

        {/* Window Controls (Right Side) */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
            className="p-1.5 rounded-md hover:bg-gray-200/50 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          {!isMobile && (
            <button 
                onClick={(e) => { e.stopPropagation(); onMaximize(); }} 
                className="p-1.5 rounded-md hover:bg-gray-200/50 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            >
                {windowState.isMaximized ? <Square className="w-2.5 h-2.5" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-1.5 rounded-md hover:bg-red-500 hover:text-white text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-white/40 dark:bg-gray-900/40">
        {children}
      </div>
    </motion.div>
  );
};