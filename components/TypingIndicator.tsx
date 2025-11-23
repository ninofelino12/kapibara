import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 py-2">
      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse"></div>
      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse [animation-delay:0.2s]"></div>
      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-pulse [animation-delay:0.4s]"></div>
    </div>
  );
};

export default TypingIndicator;