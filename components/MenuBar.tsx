import React, { useState, useEffect, useRef } from 'react';
import { Bot, Search, Command, Power, Moon, Sun } from 'lucide-react';

interface MenuBarProps {
  onOpenSettings: () => void;
  onRestart: () => void;
  onSleep: () => void;
  onNewWindow: () => void;
  onNewFolder: () => void;
  onGetInfo: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;
  copyDisabled?: boolean;
  pasteDisabled?: boolean;
  isDark: boolean;
  toggleTheme: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ 
  onOpenSettings, 
  onRestart, 
  onSleep, 
  onNewWindow, 
  onNewFolder,
  onGetInfo,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  undoDisabled,
  redoDisabled,
  copyDisabled,
  pasteDisabled,
  isDark,
  toggleTheme
}) => {
  const [date, setDate] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setActiveMenu(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + 
           ' ' + 
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const toggleMenu = (menu: string) => {
      setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMouseEnter = (menu: string) => {
      if (activeMenu) {
          setActiveMenu(menu);
      }
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <div 
        ref={menuRef}
        className="h-10 flex items-center justify-between px-2 md:px-4 text-sm font-medium z-[100] absolute top-0 w-full select-none transition-colors
        bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-b border-white/20 dark:border-gray-800 shadow-sm"
    >
      {/* Left Actions */}
      <div className="flex items-center h-full space-x-1">
        <MenuTrigger 
            icon={<Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />} 
            isActive={activeMenu === 'system'} 
            onClick={() => toggleMenu('system')}
            onMouseEnter={() => handleMouseEnter('system')}
        >
             <Dropdown isOpen={activeMenu === 'system'}>
                 <MenuItem label="About System" onClick={() => { onOpenSettings(); closeMenu(); }} />
                 <MenuItem label="Settings" onClick={() => { onOpenSettings(); closeMenu(); }} />
                 <MenuSeparator />
                 <MenuItem label="Lock Screen" shortcut="Ctrl+L" onClick={() => { onSleep(); closeMenu(); }} />
                 <MenuItem label="Log Out" shortcut="Ctrl+Q" onClick={() => { onRestart(); closeMenu(); }} />
             </Dropdown>
        </MenuTrigger>

        <div className="h-4 w-px bg-gray-400/30 mx-2 hidden md:block"></div>

        <div className="hidden md:flex items-center space-x-1">
            <MenuTrigger 
                label="File" 
                isActive={activeMenu === 'file'} 
                onClick={() => toggleMenu('file')}
                onMouseEnter={() => handleMouseEnter('file')}
            >
                <Dropdown isOpen={activeMenu === 'file'}>
                    <MenuItem label="New Window" shortcut="Ctrl+N" onClick={() => { onNewWindow(); closeMenu(); }} />
                    <MenuItem label="New Folder" shortcut="Ctrl+Shift+N" onClick={() => { onNewFolder(); closeMenu(); }} />
                    <MenuItem label="Get Info" shortcut="Ctrl+I" onClick={() => { onGetInfo(); closeMenu(); }} />
                    <MenuSeparator />
                    <MenuItem label="Close Window" shortcut="Ctrl+W" />
                </Dropdown>
            </MenuTrigger>

            <MenuTrigger 
                label="Edit" 
                isActive={activeMenu === 'edit'} 
                onClick={() => toggleMenu('edit')}
                onMouseEnter={() => handleMouseEnter('edit')}
            >
                <Dropdown isOpen={activeMenu === 'edit'}>
                    <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={() => { onUndo(); closeMenu(); }} disabled={undoDisabled} />
                    <MenuItem label="Redo" shortcut="Ctrl+Shift+Z" onClick={() => { onRedo(); closeMenu(); }} disabled={redoDisabled} />
                    <MenuSeparator />
                    <MenuItem label="Copy" shortcut="Ctrl+C" onClick={() => { onCopy?.(); closeMenu(); }} disabled={copyDisabled} />
                    <MenuItem label="Paste" shortcut="Ctrl+V" onClick={() => { onPaste?.(); closeMenu(); }} disabled={pasteDisabled} />
                    <MenuItem label="Select All" shortcut="Ctrl+A" />
                </Dropdown>
            </MenuTrigger>

            <MenuTrigger label="View" isActive={activeMenu === 'view'} onClick={() => toggleMenu('view')} onMouseEnter={() => handleMouseEnter('view')}>
                <Dropdown isOpen={activeMenu === 'view'}>
                    <MenuItem label="Icons" onClick={closeMenu} />
                    <MenuItem label="List" onClick={closeMenu} />
                    <MenuSeparator />
                    <MenuItem label="Toggle Full Screen" shortcut="F11" onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen();
                        } else {
                            document.exitFullscreen();
                        }
                        closeMenu();
                    }} />
                </Dropdown>
            </MenuTrigger>

            <MenuTrigger label="Help" isActive={activeMenu === 'help'} onClick={() => toggleMenu('help')} onMouseEnter={() => handleMouseEnter('help')}>
                <Dropdown isOpen={activeMenu === 'help'}>
                    <MenuItem label="Search" icon={<Search className="w-3 h-3" />} />
                    <MenuItem label="Documentation" />
                </Dropdown>
            </MenuTrigger>
        </div>
      </div>

      {/* Right Status */}
      <div className="flex items-center space-x-2 md:space-x-3 h-full text-gray-700 dark:text-gray-200">
        
        <div className="relative h-full flex items-center">
             <button 
                onClick={() => toggleMenu('controlCenter')} 
                className={`p-1.5 rounded-md transition-colors ${activeMenu === 'controlCenter' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
             >
                 <Command className="w-4 h-4" />
             </button>
             <Dropdown isOpen={activeMenu === 'controlCenter'} rightAlign>
                 <div className="px-3 py-2 w-48">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">System Controls</div>
                    <div className="grid grid-cols-2 gap-2">
                        <ControlToggle 
                            icon={isDark ? Moon : Sun} 
                            label={isDark ? "Dark" : "Light"} 
                            active={true} 
                            onClick={toggleTheme} 
                        />
                    </div>
                 </div>
             </Dropdown>
        </div>

        <div className="h-4 w-px bg-gray-400/30 mx-1"></div>
        
        <span className="cursor-default text-xs font-semibold opacity-80 truncate">{formatDate(date)}</span>
      </div>
    </div>
  );
};

const MenuTrigger: React.FC<{
    label?: string, 
    icon?: React.ReactNode, 
    isActive?: boolean, 
    onClick: () => void,
    onMouseEnter: () => void,
    children?: React.ReactNode 
}> = ({ label, icon, isActive, onClick, onMouseEnter, children }) => (
    <div 
        className="relative h-full flex items-center"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseEnter={onMouseEnter}
    >
        <div className={`px-2 md:px-3 py-1.5 mx-0.5 rounded-md flex items-center transition-all duration-200 cursor-pointer
            ${isActive ? 'bg-black/10 dark:bg-white/15 text-black dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'}`}>
            {icon}
            {label && <span className="text-sm">{label}</span>}
        </div>
        {children}
    </div>
);

const Dropdown: React.FC<{isOpen: boolean, children: React.ReactNode, rightAlign?: boolean}> = ({ isOpen, children, rightAlign }) => {
    if (!isOpen) return null;
    return (
        <div 
            className={`absolute top-full mt-2 min-w-[220px] w-max 
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl 
            border border-white/20 dark:border-gray-700 
            rounded-xl shadow-2xl py-2 z-[100] flex flex-col 
            animate-in fade-in slide-in-from-top-2 duration-200 ${rightAlign ? 'right-0' : 'left-0'}`}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
};

const MenuItem: React.FC<{
    label: string, 
    shortcut?: string, 
    onClick?: () => void, 
    disabled?: boolean,
    icon?: React.ReactNode 
}> = ({ label, shortcut, onClick, disabled, icon }) => (
    <button 
        className={`w-full text-left px-4 py-1.5 text-sm flex items-center justify-between group transition-colors
        ${disabled ? 'opacity-40 cursor-default' : 'hover:bg-blue-500 hover:text-white cursor-pointer text-gray-800 dark:text-gray-200'}`}
        onClick={() => !disabled && onClick?.()}
        disabled={disabled}
    >
        <div className="flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            <span>{label}</span>
        </div>
        {shortcut && <span className="ml-4 text-xs opacity-50 hidden md:block">{shortcut}</span>}
    </button>
);

const MenuSeparator: React.FC = () => (
    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5 mx-2" />
);

const ControlToggle: React.FC<{icon: any, label: string, active?: boolean, onClick?: () => void}> = ({ icon: Icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border border-transparent
        ${active ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-500'}`}
    >
        <Icon className="w-5 h-5 mb-1" />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);