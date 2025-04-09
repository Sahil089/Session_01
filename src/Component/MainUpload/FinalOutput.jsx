import React from 'react';

const FinalOutput = ({ processedText, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-700"></div>
          <p className="text-purple-800 font-medium mt-4">Processing your document...</p>
        </div>
      </div>
    );
  }

  if (!processedText) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-purple-800 mb-4">Document Summary</h2>
      
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <p className="text-gray-800 whitespace-pre-line">{processedText}</p>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button 
          onClick={() => {navigator.clipboard.writeText(processedText)}}
          className="bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy Summary
        </button>
      </div>
    </div>
  );
};

export default FinalOutput;