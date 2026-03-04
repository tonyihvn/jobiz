import React from 'react';
import { useLoading } from '../../services/LoadingContext';
import { Loader2 } from 'lucide-react';

const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm">
        <div className="flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {loadingMessage || 'Loading...'}
          </h3>
          <p className="text-sm text-slate-500">
            Please wait while we fetch your data
          </p>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
          <div className="bg-blue-600 h-full w-1/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
