import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

const FileUploader = ({ onProcessedText, setIsLoading }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');

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

      // Send text to LLM for summarization
      const summary = await summarizeText(text);
      onProcessedText(summary);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const summarizeText = async (text) => {
    try {
      // Using a better model for summarization
      const API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn";
      const API_KEY = "your api key";

      // Create a prompt that guides the model to summarize the document
      const prompt = `Please read the following document and provide a section-wise summary, dividing the content into the following parts:

Introduction: Briefly explain the background and purpose of the document.

Main Content / Body: Summarize the key ideas, findings, or discussions presented.

Conclusion / Summary: Highlight the final takeaways, results, or recommendations.

Your summary should be clear, concise, and capture the core message of each section. Avoid unnecessary details or repetition.

Document:
${text.substring(0, 1000)}`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 500,
            min_length: 100,
            do_sample: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get summary from API');
      }

      const result = await response.json();
      return result[0]?.summary_text || "Unable to generate summary.";
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw new Error('Failed to summarize text');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-purple-800 mb-6 text-center">Document Summarizer</h2>

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
