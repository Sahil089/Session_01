from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from kokoro import KPipeline
import soundfile as sf
import io
import numpy as np
import os
import re
from google import genai
from google.genai import types
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the Kokoro pipeline
pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')

# Initialize Gemini client
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")
gemini_client = genai.Client(api_key=api_key)


@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return {'error': 'No text provided'}, 400

        text = data['text']
        if len(text) > 10000:
            return {'error': 'Text too long (max 10,000 characters)'}, 413

        try:
            # Process the entire text at once
            generator = pipeline(text, voice='af_heart')
            
            # Collect all audio chunks
            all_audio = []
            for _, (gs, ps, audio) in enumerate(generator):
                all_audio.append(audio)
            
            # Concatenate all audio chunks
            if all_audio:
                combined_audio = np.concatenate(all_audio)
                
                # Convert to WAV
                buffer = io.BytesIO()
                sf.write(buffer, combined_audio, 24000, format='WAV', subtype='PCM_16')
                buffer.seek(0)
                
                return Response(
                    buffer.read(),
                    mimetype='audio/wav'
                )
            else:
                return {'error': 'No audio generated'}, 500

        except Exception as e:
            print(f"TTS Processing Error: {str(e)}")
            return {'error': str(e)}, 500

    except Exception as e:
        print(f"TTS Request Error: {str(e)}")
        return {'error': str(e)}, 500


@app.route('/generate-response', methods=['POST'])
def generate_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return {'error': 'No text provided'}, 400

        text = data['text']
        max_length = data.get('max_length', 500)  # Default 2000 characters if not specified

        def generate():
            model = "gemini-1.5-flash"
            contents = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=text)],
                ),
            ]
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="text/plain",
            )

            accumulated_text = ""
            
            for chunk in gemini_client.models.generate_content_stream(
                model=model,
                contents=contents,
                config=generate_content_config,
            ):
                chunk_text = chunk.text
                
                # Check if adding this chunk would exceed max length
                if len(accumulated_text) + len(chunk_text) > max_length:
                    remaining_space = max_length - len(accumulated_text)
                    if remaining_space > 0:
                        # Send the remaining allowed characters
                        yield chunk_text[:remaining_space]
                    break
                
                accumulated_text += chunk_text
                yield chunk_text
                
                # Early exit if we've reached the limit
                if len(accumulated_text) >= max_length:
                    break

        return Response(
            stream_with_context(generate()),
            mimetype='text/plain',
            headers={
                'X-Text-Length': str(max_length),
                'Cache-Control': 'no-cache'
            }
        )

    except Exception as e:
        return {'error': str(e)}, 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)