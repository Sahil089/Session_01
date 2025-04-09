
import React, { useState } from 'react';
import FileUploader from './Component/MainUpload/FileUploader';
import FinalOutput from './Component/MainUpload/FinalOutput';

function App() {
  const [processedText, setProcessedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-purple-900">Document Summarizer</h1>
          <p className="text-gray-600 mt-2">Upload your PDF or Word document to get an AI-powered summary</p>
        </header>
        
        <FileUploader 
          onProcessedText={setProcessedText} 
          setIsLoading={setIsLoading} 
        />
        
        <FinalOutput 
          processedText={processedText} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}

export default App;
