
import React from 'react';
import { FileOperationProgress } from '../types';

export const ProgressDialog: React.FC<{ progress: FileOperationProgress }> = ({ progress }) => {
  return (
    <div className="fixed bottom-20 right-5 w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[200] p-4 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex justify-between items-start mb-2">
         <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {progress.type === 'UPLOAD' ? 'Uploading items' : 'Downloading items'}
         </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate pr-2">
         {progress.fileName}
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-500 transition-all duration-200 ease-out relative overflow-hidden" 
            style={{ width: `${progress.progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
          </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400 font-medium">
         <span>{progress.speed}</span>
         <span>{Math.round(progress.progress)}%</span>
      </div>
    </div>
  );
};
