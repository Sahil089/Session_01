from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from kokoro import KPipeline
import soundfile as sf
import io
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the Kokoro pipeline
pipeline = KPipeline(lang_code='a')

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        # Get text from JSON request
        data = request.get_json()
        if not data or 'text' not in data:
            return {'error': 'No text provided'}, 400

        text = data['text']
        
        # Set the response headers for streaming audio
        def generate():
            # Generate audio using Kokoro
            generator = pipeline(text, voice='af_heart')
            
            # Process each audio segment as it's generated
            for _, (gs, ps, audio) in enumerate(generator):
                # Convert audio to WAV format
                audio_buffer = io.BytesIO()
                sf.write(audio_buffer, audio, 24000, format='WAV')
                audio_buffer.seek(0)
                
                # Yield each chunk of audio data
                yield audio_buffer.read()
        
        # Return streaming response
        return Response(
            stream_with_context(generate()),
            mimetype='audio/wav'
        )

    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(port=5050)