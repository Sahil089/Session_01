import React, { useState, useEffect, useCallback, useRef } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { BsChatDotsFill } from "react-icons/bs";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState("idle");
  const [recognitionError, setRecognitionError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBotMessage, setCurrentBotMessage] = useState("");
  
  // Use refs to track state across event handlers without causing re-renders
  const listeningRef = useRef(false);
  const processingRef = useRef(false);
  const silenceTimeoutRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const audioRef = useRef(null);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  // Define callback functions using useCallback to prevent unnecessary re-creation
  const startListening = useCallback(() => {
    if (processingRef.current || listeningRef.current) return;
    
    resetTranscript();
    setRecognitionError(null);
    listeningRef.current = true;
    
    try {
      SpeechRecognition.startListening({ 
        continuous: false,
        language: 'en-US',
        interimResults: true
      });
      setRecognitionStatus("listening");
    } catch (error) {
      console.error("Speech recognition start error:", error);
      setRecognitionError("Failed to start listening. Please try again.");
      listeningRef.current = false;
      setRecognitionStatus("idle");
    }
  }, [resetTranscript]);

  const stopListening = useCallback(() => {
    if (!listeningRef.current) return;
    
    listeningRef.current = false;
    SpeechRecognition.stopListening();
    
    if (transcript.trim()) {
      setRecognitionStatus("processing");
      processingRef.current = true;
    } else {
      setRecognitionStatus("idle");
    }
  }, [transcript]);

  // Handle streaming audio from the API
  const playStreamingAudio = useCallback(async (text) => {
    try {
      setIsPlaying(true);
      setCurrentBotMessage(text);
      
      // Create audio context for streaming
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Fetch streaming audio from server
      const response = await fetch('http://127.0.0.1:5050/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });
      
      if (!response.ok) {
        throw new Error('TTS API response was not ok');
      }
      
      // Get the reader from the stream
      const reader = response.body.getReader();
      
      // Create a new ReadableStream and pipe the response to it
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        }
      });
      
      // Create a new response from our stream
      const streamResponse = new Response(stream);
      // Get the blob from the response
      const blob = await streamResponse.blob();
      // Create object URL
      const url = URL.createObjectURL(blob);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.play();
      } else {
        audioRef.current = new Audio(url);
        audioRef.current.play();
      }
      
      // Cleanup when audio ends
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      
    } catch (error) {
      console.error('Error playing streaming audio:', error);
      setIsPlaying(false);
    }
  }, []);

  // Define handleSend using useCallback
  const handleSend = useCallback(async () => {
    if (!transcript.trim()) {
      processingRef.current = false;
      return;
    }

    const userInput = transcript.trim();
    lastTranscriptRef.current = userInput;
    
    // Add user message immediately
    setMessages(prev => [...prev, { type: "user", text: userInput }]);
    
    try {
      setIsLoading(true);
      
      // Generate bot response (you can replace this with your actual API call)
      const botResponse = `I heard you say: "${userInput}". How can I help with that?`;
      
      // Add bot message
      setMessages(prev => [...prev, { type: "bot", text: botResponse }]);
      
      // Play streaming audio
      await playStreamingAudio(botResponse);
      
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages(prev => [...prev, { 
        type: "bot", 
        text: "Sorry, I couldn't process that message." 
      }]);
    } finally {
      resetTranscript();
      setIsLoading(false);
      processingRef.current = false;
      setRecognitionStatus("idle");
    }
  }, [transcript, resetTranscript, playStreamingAudio]);

  // Auto-restart listening after processing completes
  useEffect(() => {
    if (!listening && transcript.trim() && !processingRef.current) {
      processingRef.current = true;
      handleSend();
    }
  }, [listening, transcript, handleSend]);

  // Update recognition status based on listening state and transcript
  useEffect(() => {
    if (listening) {
      setRecognitionStatus(transcript ? "active" : "listening");
    }
    
    // Set up silence detection
    if (listening && transcript) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      silenceTimeoutRef.current = setTimeout(() => {
        if (listening && listeningRef.current) {
          stopListening();
        }
      }, 1500);
    }
    
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [listening, transcript, stopListening]);

  // Set up keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat && !processingRef.current && !isLoading) {
        e.preventDefault();
        startListening();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space" && listeningRef.current) {
        e.preventDefault();
        stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startListening, stopListening, isLoading]);

  // Automatic restart of listening if browser errors occur
  useEffect(() => {
    const checkAndRestartRecognition = () => {
      if (!listening && listeningRef.current && !processingRef.current) {
        setTimeout(startListening, 100);
      }
    };
    
    const intervalId = setInterval(checkAndRestartRecognition, 3000);
    
    return () => clearInterval(intervalId);
  }, [listening, startListening]);

  // Browser support checks
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-red-50 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold mb-6 text-center text-red-800">
          Error: Browser doesn't support speech recognition
        </h1>
        <p>
          Try using a modern browser like Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  if (!isMicrophoneAvailable) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-yellow-50 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold mb-6 text-center text-yellow-800">
          Microphone Access Required
        </h1>
        <p>
          Please allow microphone access in your browser settings to use the voice chatbot.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto bg-gray-50 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">Voice Assistant</h1>
      
      {/* Bot visualization */}
      <div className="mb-8 flex flex-col items-center">
        <div className={`w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center mb-4 transition-all duration-300 ${isPlaying ? 'scale-110 shadow-lg' : ''}`}>
          <BsChatDotsFill size={64} color="white" className={isPlaying ? 'animate-pulse' : ''} />
        </div>
        
        {/* Caption area */}
        <div className="w-full p-4 bg-white rounded-lg shadow-md min-h-16 text-center">
          {isPlaying ? (
            <p className="text-blue-800 font-medium">{currentBotMessage}</p>
          ) : (
            <p className="text-gray-500 italic">Assistant is waiting...</p>
          )}
        </div>
      </div>
      
      {/* User transcript area */}
      <div className={`w-full p-3 bg-gray-100 rounded-lg mb-6 min-h-16 ${transcript ? '' : 'flex items-center justify-center'}`}>
        {transcript ? (
          <p className="text-gray-800">{transcript}</p>
        ) : (
          <p className="text-gray-500 italic text-center">Your voice input will appear here</p>
        )}
      </div>
      
      {/* Recent conversation history */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Recent conversation:</h2>
        <div className="max-h-40 overflow-y-auto p-3 bg-white rounded-lg shadow-inner">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 italic">No messages yet</p>
          ) : (
            messages.slice(-4).map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded ${
                  msg.type === "user" 
                    ? "bg-gray-100 text-gray-800" 
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                <span className="text-xs font-bold block mb-1">
                  {msg.type === "user" ? "You:" : "Assistant:"}
                </span>
                {msg.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Microphone button */}
      <div className="flex justify-center">
        <button
          onMouseDown={listeningRef.current || processingRef.current ? null : startListening}
          onMouseUp={listeningRef.current ? stopListening : null}
          onTouchStart={listeningRef.current || processingRef.current ? null : startListening}
          onTouchEnd={listeningRef.current ? stopListening : null}
          disabled={isLoading || processingRef.current}
          className={`p-4 rounded-full transition-all ${
            listening 
              ? "bg-green-600 text-white shadow-lg scale-110 pulse-animation" 
              : isLoading || processingRef.current
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {listening ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
        </button>
        <p className="text-sm text-gray-600 ml-4 self-center">
          {listening ? "Release to send" : isLoading || processingRef.current ? "Processing..." : "Hold to speak"}
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default ChatBot;                   