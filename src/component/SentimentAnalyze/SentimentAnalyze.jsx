import React, { useState } from 'react';
import { analyzeSentimentWithGemini } from '../../utils/gemini';

function SentimentAnalyze() {
  const [review, setReview] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Inside the SentimentAnalyze component
  const analyzeSentiment = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const data = await analyzeSentimentWithGemini(review);
      setReviews([...reviews, {
        text: review,
        sentiment: data.sentiment,
        emoji: data.emoji,
        explanation: data.explanation,
        timestamp: new Date().toLocaleString()
      }]);
      setReview('');
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Sentiment Analyzer</h1>
        
        {/* Input Form */}
        <form onSubmit={analyzeSentiment} className="mb-8">
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full p-4 rounded-lg bg-white/5 text-white border border-purple-300/30 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none"
              rows="4"
              placeholder="Enter your review here..."
            />
            <button
              type="submit"
              disabled={loading || !review.trim()}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg hover:from-purple-700 hover:to-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyzing...' : 'Analyze Sentiment'}
            </button>
          </div>
        </form>

        {/* Review Cards */}
        <div className="grid gap-6">
          {reviews.map((item, index) => (
            <div key={index} className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{item.emoji}</span>
                <span className={`px-4 py-1 rounded-full ${
                  item.sentiment === 'POSITIVE' ? 'bg-green-500/20 text-green-300' :
                  item.sentiment === 'NEGATIVE' ? 'bg-red-500/20 text-red-300' :
                  'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {item.sentiment}
                </span>
              </div>
              <p className="text-white mb-4">{item.text}</p>
              <p className="text-purple-300 text-sm">{item.explanation}</p>
              <p className="text-gray-400 text-xs mt-4">{item.timestamp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SentimentAnalyze;