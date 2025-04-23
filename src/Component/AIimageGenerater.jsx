import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ImageGenerater = () => {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(false);

    const generateImage = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                "endpoint",
                {
                    headers: {
                        Authorization: "Bearer API KEY",
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        inputs: prompt,
                        options: {
                            wait_for_model: true
                        }
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            setImage(imageUrl);

        } catch (error) {
            console.error('Error generating image:', error);
            alert('Failed to generate image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-700 p-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto p-6 bg-gradient-to-b from-white/10 to-purple-500/10 backdrop-blur-sm rounded-xl shadow-2xl"
            >
                <motion.h2 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-3xl font-bold mb-6 text-white text-center"
                >
                    AI Image Generator
                </motion.h2>
                <div className="mb-6">
                    <motion.input
                        whileFocus={{ scale: 1.02 }}
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter your prompt here..."
                        className="w-full p-3 border border-purple-300 rounded-lg bg-white/10 text-white placeholder-purple-200 backdrop-blur-sm focus:outline-none focus:border-purple-500 transition-all"
                    />
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={generateImage}
                    disabled={loading || !prompt}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-2"
                            />
                            Generating...
                        </div>
                    ) : 'Generate Image'}
                </motion.button>
                {image && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                    >
                        <motion.img 
                            layoutId="generated-image"
                            src={image} 
                            alt="Generated" 
                            className="w-full rounded-lg shadow-2xl"
                        />
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default ImageGenerater;