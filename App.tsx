import React from 'react';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  return (
    <main className="h-full w-full bg-black flex flex-col items-center justify-center">
      <ChatInterface />
    </main>
  );
};

export default App;