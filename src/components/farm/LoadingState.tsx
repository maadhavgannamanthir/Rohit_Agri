import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading farm data...' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-stone-500">
    <div className="w-14 h-14 rounded-full bg-[#6B8E23]/10 flex items-center justify-center mb-4">
      <Loader2 className="w-7 h-7 text-[#6B8E23] animate-spin" />
    </div>
    <div className="text-sm font-medium">{label}</div>
    <div className="text-xs text-stone-400 mt-1">Fetching from the cloud</div>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
    <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
      <AlertTriangle className="w-6 h-6 text-red-600" />
    </div>
    <div className="font-semibold text-red-800">Something went wrong</div>
    <div className="text-sm text-red-700 mt-1 break-words">{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    )}
  </div>
);

export const SectionSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-stone-200 rounded w-1/3" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-stone-100 rounded-2xl" />
      ))}
    </div>
    <div className="h-64 bg-stone-100 rounded-2xl" />
  </div>
);
