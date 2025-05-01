import React, { useState, useEffect, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FaMicrophone, FaMicrophoneSlash, FaPaperPlane } from "react-icons/fa";
import { BsChatDotsFill } from "react-icons/bs";
import { FaVolumeUp, FaStop } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import removeMarkdown from "remove-markdown";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // Auto-scroll to the latest message
  useEffect(() => {
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  // Handle text-to-speech
  const handleTextToSpeech = async (text) => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);
      setAudioLoading(true);
      const plainText = removeMarkdown(text);
      
      const response = await fetch('http://127.0.0.1:5050/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: plainText }),
      });

      if (!response.ok) throw new Error('TTS API response was not ok');

      // Get the complete audio data
      const audioData = await response.arrayBuffer();
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      setAudioLoading(false);
      await audio.play();
    } catch (error) {
      console.error('TTS Error:', error);
      setIsPlaying(false);
      setAudioLoading(false);
      if (audioRef.current) {
        audioRef.current = null;
      }
    }
  };

  // Add loading spinner or progress bar for better UX
{isPlaying && (
    <div className="flex justify-center items-center">
        <div className="loader">Playing audio...</div>
    </div>
)}
  // Process user input and get bot response
  const processUserInput = async (userInput) => {
    if (!userInput.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { type: "user", text: userInput }]);
    
    try {
      setIsLoading(true);
      
      // Call generate-response API
      const response = await fetch('http://127.0.0.1:5050/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: userInput }),
      });
  
      if (!response.ok) throw new Error('Failed to get response');
  
      const botResponse = await response.text();
      
      // Add bot message
      setMessages(prev => [...prev, { 
        type: "bot", 
        text: botResponse,
        timestamp: new Date().toISOString()
      }]);
      
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages(prev => [...prev, { 
        type: "bot", 
        text: "Sorry, I couldn't process that message." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text input
  const handleTextInput = (e) => {
    setInputText(e.target.value);
  };

  // Handle text submit
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    processUserInput(inputText);
    setInputText("");
  };

  // Handle voice input
  const handleVoiceInput = async () => {
    if (!transcript.trim()) return;
    
    await processUserInput(transcript.trim());
    resetTranscript();
  };

  // Auto-process voice input when speech recognition stops
  useEffect(() => {
    if (!listening && transcript.trim()) {
      handleVoiceInput();
    }
  }, [listening, transcript]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-red-50 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold mb-6 text-center text-red-800">
          Error: Browser doesn't support speech recognition
        </h1>
      </div>
    );
  }

  if (!isMicrophoneAvailable) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-yellow-50 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold mb-6 text-center text-yellow-800">
          Microphone Access Required
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen mx-auto bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold text-center">AI Chat Assistant</h1>
      </div>

      {/* Chat Messages */}
      <div id="chat-container" className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-black">
        {messages.length === 0 && (
          <div className="flex justify-center items-center h-full text-gray-400">
            <div className="text-center p-8 rounded-xl bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm">
              <BsChatDotsFill className="mx-auto text-6xl mb-4 text-purple-400" />
              <p className="text-gray-300 font-light">Start a conversation</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 shadow-lg ${
                msg.type === 'user'
                  ? 'bg-gradient-to-r from-purple-700 to-purple-500 text-white rounded-br-none'
                  : 'bg-gradient-to-r from-gray-800 to-gray-700 text-gray-100 rounded-bl-none border-l-2 border-purple-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="break-words">
                  <ReactMarkdown>
                    {msg.text}
                  </ReactMarkdown>
                </div>
                {msg.type === 'bot' && (
                  <button
                    onClick={() => handleTextToSpeech(msg.text)}
                    className={`ml-2 p-1.5 rounded-full transition-all hover:bg-purple-500/20 ${
                      isPlaying && audioRef.current
                        ? 'text-green-400 bg-green-400/10'
                        : 'text-purple-300 hover:text-purple-100'
                    }`}
                    aria-label={isPlaying ? "Stop playback" : "Listen to response"}
                    disabled={audioLoading}
                  >
                    {audioLoading ? (
                      <div className="h-4 w-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                    ) : isPlaying && audioRef.current ? (
                      <FaStop className="h-4 w-4" />
                    ) : (
                      <FaVolumeUp className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 rounded-bl-none border-l-2 border-purple-400 shadow-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-purple-900/50 p-4 bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-lg">
        <form onSubmit={handleTextSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={listening ? SpeechRecognition.stopListening : SpeechRecognition.startListening}
            disabled={isLoading}
            className={`p-3 rounded-full flex-shrink-0 transition-all shadow-lg ${
              listening
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:from-purple-600 hover:to-purple-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={listening ? "Stop listening" : "Start listening"}
          >
            {listening ? <FaMicrophone size={18} /> : <FaMicrophoneSlash size={18} />}
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={handleTextInput}
              placeholder="Type your message..."
              className="w-full bg-gray-800/80 rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 shadow-inner"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-purple-400 hover:text-purple-200 disabled:text-gray-500 transition-colors hover:bg-purple-500/20 rounded-full"
              aria-label="Send message"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>

  );
};

export default ChatBot;