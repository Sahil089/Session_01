
import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

function App() {
  const [joke, setJoke] = useState('');
  const [loading, setLoading] = useState(false);

  const generateJoke = async () => {
    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const categories = ['dad joke', 'knock-knock joke', 'animal joke', 'food joke', 'science joke'];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const prompt = `Tell me a funny, clean ${randomCategory} suitable for all ages. Make sure it's different each time. Only respond with the joke itself.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setJoke(response.text());
    } catch (error) {
      console.error('Error generating joke:', error);
      setJoke('Failed to generate joke. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">AI Joke Generator</h1>
        
        <div className="mb-6">
          <button
            onClick={generateJoke}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Joke'}
          </button>
        </div>

        {joke && (
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-gray-800 text-lg">{joke}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
