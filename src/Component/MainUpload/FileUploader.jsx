import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

const FileUploader = ({ onProcessedText, setIsLoading }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
  }, []);
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setError('');
    }
  };

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n';
      }

      return text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const extractTextFromDOCX = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setIsLoading(true);
      const fileType = selectedFile.type;
      let text = '';

      if (fileType === 'application/pdf') {
        text = await extractTextFromPDF(selectedFile);
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDOCX(selectedFile);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or Word document.');
      }

      setExtractedText(text);

      // Send text to LLM for processing with custom prompt
      const result = await processTextWithPrompt(text, customPrompt);
      onProcessedText(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processTextWithPrompt = async (text, prompt) => {
    try {
      // Using a better model for processing
      const API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn";
      const API_KEY = "api key ";

      // Default prompt if user doesn't provide one
      const userPrompt = prompt.trim() || "Please summarize the following document:";
      
      // Format the prompt to be more effective with the BART model
      const fullPrompt = `Task: ${userPrompt}\n\nDocument: ${text.substring(0, 2000)}`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_length: 500,
            min_length: 100,
            do_sample: true,
            temperature: 0.7,
            num_beams: 4
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from API');
      }

      const result = await response.json();
      return result[0]?.summary_text || "Unable to generate response.";
    } catch (error) {
      console.error('Error processing text:', error);
      throw new Error('Failed to process text with the provided prompt');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-purple-800 mb-6 text-center">Document Processor</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept=".pdf,.docx"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-purple-800 font-medium">
              {fileName ? fileName : 'Click to upload PDF or Word document'}
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF and DOCX formats
            </p>
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700">
            Custom Prompt (instructions for processing)
          </label>
          <textarea
            id="custom-prompt"
            rows="3"
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter your instructions for processing the document..."
          ></textarea>
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-purple-700 text-white py-2 px-4 rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          Process Document
        </button>
      </form>
    </div>
  );
};

export default FileUploader;
