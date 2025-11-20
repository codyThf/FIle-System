import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Image as ImageIcon, Info, Users, Check, Shield, Lock, UserCircle, Save, Edit2, X, Key, Upload, Camera } from 'lucide-react';
import { APP_VERSION, AUTHOR_NAME, WALLPAPERS } from '../constants';
import { User, UserRole, LabRole } from '../types';

interface SettingsWindowProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  wallpaper: string;
  setWallpaper: (url: string) => void;
  currentUser?: User | null;
  users: User[];
  onUpdateUser: (user: User) => void;
}

export const SettingsWindow: React.FC<SettingsWindowProps> = ({ theme, setTheme, wallpaper, setWallpaper, currentUser, users, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'desktop' | 'users' | 'profile' | 'about'>('general');
  
  // Profile Form State (My Profile)
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRole, setEditRole] = useState('');

  // Team Editing State (Team Tab)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamAvatar, setTeamAvatar] = useState('');
  const [teamUserRole, setTeamUserRole] = useState<UserRole>(UserRole.USER);
  const [teamLabRole, setTeamLabRole] = useState<string>('');
  const [teamBio, setTeamBio] = useState('');
  const [teamPassword, setTeamPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const teamFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (currentUser) {
          setEditName(currentUser.fullName);
          setEditAvatar(currentUser.avatar || '');
          setEditBio(currentUser.bio || '');
          setEditRole(currentUser.labRole || '');
      }
  }, [currentUser]);

  // --- Image Upload Handler ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isTeam: boolean = false) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              if (isTeam) {
                  setTeamAvatar(result);
              } else {
                  setEditAvatar(result);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // --- My Profile Handlers ---
  const handleSaveProfile = () => {
      if (!currentUser) return;
      onUpdateUser({
          ...currentUser,
          fullName: editName,
          avatar: editAvatar,
          bio: editBio,
          labRole: editRole
      });
  };

  // --- Team Editing Handlers ---
  const startEditingUser = (user: User) => {
      setEditingId(user.id);
      setTeamName(user.fullName);
      setTeamAvatar(user.avatar || '');
      setTeamUserRole(user.role);
      setTeamLabRole(user.labRole || '');
      setTeamBio(user.bio || '');
      setTeamPassword(user.password || '');
  };

  const cancelEditingUser = () => {
      setEditingId(null);
      setTeamName('');
      setTeamPassword('');
  };

  const saveTeamUser = () => {
      const userToUpdate = users.find(u => u.id === editingId);
      if (userToUpdate) {
          onUpdateUser({
              ...userToUpdate,
              fullName: teamName,
              avatar: teamAvatar,
              role: teamUserRole,
              labRole: teamLabRole,
              bio: teamBio,
              password: teamPassword
          });
      }
      setEditingId(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar / Top Nav on Mobile */}
      <div className="w-full md:w-48 bg-gray-100/50 dark:bg-gray-800/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible space-x-2 md:space-x-0 space-y-0 md:space-y-1 shrink-0">
        <SettingsTab 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')} 
            icon={Monitor} 
            label="General" 
        />
        <SettingsTab 
            active={activeTab === 'desktop'} 
            onClick={() => setActiveTab('desktop')} 
            icon={ImageIcon} 
            label="Desktop" 
        />
        <SettingsTab 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={UserCircle} 
            label="Profile" 
        />
        <SettingsTab 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={Users} 
            label="Team" 
        />
        <SettingsTab 
            active={activeTab === 'about'} 
            onClick={() => setActiveTab('about')} 
            icon={Info} 
            label="About" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-semibold mb-4">Appearance</h2>
            
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme Mode</label>
                <div className="flex space-x-4">
                    <div 
                        className={`cursor-pointer group flex flex-col items-center space-y-2 ${theme === 'light' ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        onClick={() => setTheme('light')}
                    >
                        <div className={`w-24 h-16 bg-white border-2 rounded-lg shadow-sm relative overflow-hidden ${theme === 'light' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}>
                            <div className="absolute top-0 left-0 right-0 h-3 bg-gray-100 border-b border-gray-200"></div>
                            <div className="absolute top-5 left-2 w-12 h-8 bg-blue-50 rounded-sm"></div>
                        </div>
                        <span className="text-xs font-medium">Light</span>
                    </div>

                    <div 
                        className={`cursor-pointer group flex flex-col items-center space-y-2 ${theme === 'dark' ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        onClick={() => setTheme('dark')}
                    >
                        <div className={`w-24 h-16 bg-gray-900 border-2 rounded-lg shadow-sm relative overflow-hidden ${theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-600'}`}>
                             <div className="absolute top-0 left-0 right-0 h-3 bg-gray-800 border-b border-gray-700"></div>
                             <div className="absolute top-5 left-2 w-12 h-8 bg-gray-700 rounded-sm"></div>
                        </div>
                        <span className="text-xs font-medium">Dark</span>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'desktop' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-semibold mb-4">Wallpaper</h2>
                <div className="grid grid-cols-2 gap-4">
                    {WALLPAPERS.map((wp) => (
                        <div 
                            key={wp.name}
                            className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer group border-2 transition-all ${wallpaper === wp.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                            onClick={() => setWallpaper(wp.url)}
                        >
                            <img src={wp.url} alt={wp.name} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {wp.name}
                            </div>
                            {wallpaper === wp.url && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'profile' && currentUser && (
             <div className="space-y-6 max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-lg font-semibold mb-4">My Profile</h2>
                
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    <div className="flex flex-col items-center space-y-2 group relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-200 dark:border-gray-700 shadow-md relative">
                            <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, false)}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-blue-500 hover:underline flex items-center">
                            <Upload className="w-3 h-3 mr-1" /> Upload Photo
                        </button>
                    </div>
                    
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Full Name</label>
                            <input 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Lab Role</label>
                            <select 
                                value={editRole} 
                                onChange={(e) => setEditRole(e.target.value)}
                                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {Object.values(LabRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div>
                     <label className="block text-xs font-medium text-gray-500 uppercase mb-1">System Group</label>
                     <div className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between cursor-not-allowed">
                        <span>{currentUser.role}</span>
                        <Lock className="w-3 h-3 opacity-50" />
                     </div>
                     <p className="text-[10px] text-gray-400 mt-1">Only Admins can change system groups.</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Bio / Description</label>
                    <textarea 
                        value={editBio} 
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none"
                        placeholder="Describe your role and responsibilities..."
                    />
                </div>

                <div className="pt-4 pb-6">
                    <button 
                        onClick={handleSaveProfile}
                        className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </button>
                </div>
             </div>
        )}

        {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>UR Lab Team</span>
                    {currentUser?.role === UserRole.ADMIN ? (
                        <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 flex items-center"><Shield className="w-3 h-3 mr-1"/> Admin Mode</span>
                    ) : (
                        <span className="ml-2 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 flex items-center"><Users className="w-3 h-3 mr-1"/> Read Only</span>
                    )}
                </h2>

                <div className="grid gap-4">
                    {users.map(user => {
                        const isEditing = editingId === user.id;

                        if (isEditing) {
                            return (
                                <div key={user.id} className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-xl p-4 shadow-lg animate-in fade-in zoom-in-95">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-sm font-bold text-blue-600">Editing User (Admin)</span>
                                        <div className="flex space-x-2">
                                            <button onClick={cancelEditingUser} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><X className="w-4 h-4"/></button>
                                            <button onClick={saveTeamUser} className="p-1 bg-blue-500 hover:bg-blue-600 rounded text-white"><Check className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                                        <div className="flex flex-col items-center group relative">
                                            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border border-gray-300 relative cursor-pointer" onClick={() => teamFileInputRef.current?.click()}>
                                                <img src={teamAvatar} alt="preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Camera className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                            <input 
                                                type="file" 
                                                ref={teamFileInputRef} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, true)}
                                            />
                                            <button onClick={() => teamFileInputRef.current?.click()} className="text-[10px] text-blue-500 mt-1 hover:underline">
                                                Change Photo
                                            </button>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 font-semibold uppercase">Name</label>
                                                <input 
                                                    value={teamName} 
                                                    onChange={(e) => setTeamName(e.target.value)} 
                                                    className="w-full p-2 mt-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-semibold uppercase">Password</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text"
                                                        value={teamPassword} 
                                                        onChange={(e) => setTeamPassword(e.target.value)} 
                                                        className="w-full p-2 mt-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 pl-8 font-mono" 
                                                    />
                                                    <Key className="w-3 h-3 absolute left-2.5 top-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 font-semibold uppercase">System Group</label>
                                            <select 
                                                value={teamUserRole} 
                                                onChange={(e) => setTeamUserRole(e.target.value as UserRole)} 
                                                className="w-full p-2 mt-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/10"
                                            >
                                                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 font-semibold uppercase">Lab Position</label>
                                            <select 
                                                value={teamLabRole} 
                                                onChange={(e) => setTeamLabRole(e.target.value)} 
                                                className="w-full p-2 mt-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                            >
                                                {Object.values(LabRole).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-gray-500 font-semibold uppercase">Bio</label>
                                            <textarea 
                                                value={teamBio} 
                                                onChange={(e) => setTeamBio(e.target.value)} 
                                                className="w-full p-2 mt-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 h-20 resize-none" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start space-x-4 shadow-sm hover:shadow-md transition-all group relative">
                                {currentUser?.role === UserRole.ADMIN && (
                                    <button 
                                        onClick={() => startEditingUser(user)}
                                        className="absolute top-3 right-3 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-500 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10 md:block hidden"
                                        title="Edit User Details"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {/* Mobile Edit Button (Always Visible for Admin) */}
                                {currentUser?.role === UserRole.ADMIN && (
                                     <button 
                                        onClick={() => startEditingUser(user)}
                                        className="absolute top-3 right-3 p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full md:hidden block"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                
                                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-600">
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="avatar"/>
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center justify-between mb-1">
                                        <div>
                                            <h3 className="text-sm font-bold flex items-center text-gray-900 dark:text-white">
                                                {user.fullName} 
                                                {user.id === currentUser?.id && <span className="ml-2 text-[10px] text-blue-500 font-normal">(You)</span>}
                                            </h3>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                {user.labRole || 'Member'}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 hidden sm:flex">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-medium ${
                                                user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                user.role === UserRole.JUNIOR ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                                        "{user.bio || 'No bio provided.'}"
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4 mt-4">
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-1.5"/> Access Policy
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                        Access to files is determined by system groups (Admin, User, Junior). Only Admins can change these assignments. <br/>
                        Lab Roles are for identification within the lab environment and can be updated by users.
                    </p>
                </div>
            </div>
        )}

        {activeTab === 'about' && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in zoom-in-95 duration-300 pb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl flex items-center justify-center text-white text-3xl">
                    
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">UR Lab File System</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Version {APP_VERSION}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-xs">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Author</span>
                        <span className="font-medium">{AUTHOR_NAME}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2">
                        <span className="text-gray-500 dark:text-gray-400">License</span>
                        <span className="font-medium">MIT</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const SettingsTab: React.FC<{active: boolean, onClick: () => void, icon: any, label: string}> = ({active, onClick, icon: Icon, label}) => (
    <button 
        onClick={onClick}
        className={`min-w-[80px] md:w-full flex md:flex-row flex-col items-center md:space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            active 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
    >
        <Icon className={`w-5 h-5 md:w-4 md:h-4 mb-1 md:mb-0 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
        <span>{label}</span>
    </button>
);