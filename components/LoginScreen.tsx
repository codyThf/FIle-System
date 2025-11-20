
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ArrowRight, Lock, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  wallpaper: string;
  users: User[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, wallpaper, users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(users[0]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleLogin = () => {
    if (!selectedUser) return;

    const isValid = password === (selectedUser.password || selectedUser.username);

    if (isValid) {
      onLogin(selectedUser);
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div 
        className="w-screen h-screen bg-cover bg-center flex flex-col items-center justify-center relative overflow-hidden font-sans"
        style={{ backgroundImage: `url(${wallpaper})` }}
    >
      {/* Blur Overlay with Fade In */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 1 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-xl z-0"
      />

      <AnimatePresence mode="wait">
        {selectedUser ? (
           <motion.div 
              key="user-login"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="z-10 flex flex-col items-center w-full max-w-md"
           >
              <div className="flex flex-col items-center">
                 <motion.div 
                    layoutId={`avatar-${selectedUser.id}`}
                    className="w-24 h-24 rounded-full p-1 bg-white/20 mb-4 shadow-2xl relative overflow-hidden"
                 >
                    <img src={selectedUser.avatar} alt={selectedUser.username} className="w-full h-full rounded-full object-cover" />
                 </motion.div>
                 
                 <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white text-xl font-semibold mb-4 text-shadow-lg tracking-wide"
                 >
                    {selectedUser.fullName}
                 </motion.h2>
                 
                 <div className="flex flex-col items-center space-y-2 w-full relative">
                    <div className="relative">
                        <motion.input 
                           type="password" 
                           placeholder="Enter Password" 
                           className={`bg-white/20 text-white placeholder-gray-300 border border-white/30 rounded-full px-4 py-1.5 w-48 focus:outline-none focus:bg-white/30 focus:border-white/50 transition-colors text-sm backdrop-blur-md text-center`}
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                           autoFocus
                           animate={error ? { x: [-5, 5, -5, 5, 0], borderColor: '#f87171', boxShadow: '0 0 0 2px rgba(248, 113, 113, 0.5)' } : { x: 0, borderColor: 'rgba(255,255,255,0.3)', boxShadow: 'none' }}
                           transition={{ type: 'tween', duration: 0.4 }}
                        />
                        <AnimatePresence>
                            {password.length > 0 && (
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    onClick={handleLogin}
                                    className="absolute right-1 top-1 bottom-1 p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors flex items-center justify-center"
                                >
                                    <ArrowRight className="w-3 h-3" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                 </div>

                 <div className="h-6 mt-2 flex flex-col items-center">
                    <AnimatePresence mode="wait">
                        {error ? (
                            <motion.span 
                                key="error"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-red-300 text-xs font-medium shadow-black drop-shadow-md flex items-center"
                            >
                                Incorrect password
                            </motion.span>
                        ) : showHint ? (
                            <motion.span 
                                key="hint"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-gray-300 text-xs font-medium shadow-black drop-shadow-md"
                            >
                                Hint: {selectedUser.password || selectedUser.username}
                            </motion.span>
                        ) : null}
                    </AnimatePresence>
                 </div>
                 
                 <div className="flex items-center space-x-4 mt-8">
                     <button 
                       onClick={() => { setSelectedUser(null); setPassword(''); setError(false); setShowHint(false); }}
                       className="flex flex-col items-center text-white/70 hover:text-white transition-colors group"
                     >
                       <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center mb-1 transition-colors">
                          <X className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] uppercase tracking-wider">Switch User</span>
                     </button>
                     
                     <button 
                       onClick={() => setShowHint(!showHint)}
                       className="flex flex-col items-center text-white/70 hover:text-white transition-colors group"
                     >
                         <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center mb-1 transition-colors">
                            <HelpCircle className="w-4 h-4" />
                         </div>
                         <span className="text-[10px] uppercase tracking-wider">Hint</span>
                     </button>
                 </div>
              </div>
           </motion.div>
        ) : (
            <motion.div 
                key="user-grid"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={{ duration: 0.3 }}
                className="z-10 flex flex-col items-center"
            >
                 <div className="grid grid-cols-3 gap-12">
                    {users.map(user => (
                        <motion.div 
                            layoutId={`avatar-${user.id}`}
                            key={user.id} 
                            className="flex flex-col items-center cursor-pointer group"
                            onClick={() => { setSelectedUser(user); setError(false); setShowHint(false); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="w-24 h-24 rounded-full bg-white/20 mb-4 shadow-lg overflow-hidden relative ring-2 ring-transparent group-hover:ring-white/50 transition-all">
                                 <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-white font-medium text-lg text-shadow-sm">{user.fullName}</span>
                            <span className="text-white/50 text-xs uppercase tracking-wider mt-1">{user.role}</span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="absolute bottom-8 flex flex-col items-center text-white/60 z-10">
          <div className="flex flex-col items-center mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <Lock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium">FileVault On</span>
          </div>
          <div className="flex space-x-4 text-xs font-medium">
             <button className="hover:text-white transition-colors">Sleep</button>
             <button className="hover:text-white transition-colors">Restart</button>
             <button className="hover:text-white transition-colors">Shut Down</button>
          </div>
      </div>
    </div>
  );
};