import websocket
import requests
from flask import Flask, request, jsonify, render_template
import json
import logging
import os
import uuid
import base64
import io

app = Flask(__name__, template_folder=os.path.join(os.getcwd(), 'src/templates'))

# Set up logging
logging.basicConfig(level=logging.INFO)

# Configuration
COMFYUI_API_URL = "http://127.0.0.1:8188"
CLIENT_ID = str(uuid.uuid4())

PROMPT_TEMPLATE = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 12,
            "denoise": 0.6,
            "latent_image": ["5", 0],
            "model": ["4", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "seed": 8566257,
            "steps": 60
        }
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
            "ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"
        }
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "batch_size": 1,
            "height": 512,
            "width": 512
        }
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["4", 1],
            "text": "" 
        }
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
            "clip": ["4", 1],
            "text": "bad hands"
        }
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {
            "samples": ["3", 0],
            "vae": ["4", 2]
        }
    },
    "save_image_websocket_node": {
        "class_type": "SaveImageWebsocket",
        "inputs": {
            "images": ["8", 0]
        }
    }
}

#Function to send prompt via HTTP
def queue_prompt(prompt):
    """
        Send the prompt to ComfyUI and return the prompt ID.
    """
    data = json.dumps({"prompt": prompt, "client_id": CLIENT_ID}).encode("utf-8")
    response = requests.post(f"{COMFYUI_API_URL}/prompt", data=data)
    return response.json()

#Function to get images using WebSockets
def get_images_via_websocket(prompt):
    """
    Connect to WebSocket, get image data, and return Base64-encoded image.
    """
    ws = websocket.WebSocket()
    ws.connect(f"ws://{COMFYUI_API_URL.replace('http://', '')}/ws?clientId={CLIENT_ID}")

    # Send the prompt to ComfyUI
    response_data = queue_prompt(prompt)
    prompt_id = response_data.get("prompt_id")

    if not prompt_id:
        return None  # No prompt_id received, something went wrong

    output_images = []
    current_node = ""

    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message["type"] == "executing":
                data = message["data"]
                if data["prompt_id"] == prompt_id:
                    if data["node"] is None:
                        break
                    else:
                        current_node = data["node"]
        else:
            if current_node == "save_image_websocket_node":
                output_images.append(out[8:])  # Extract image bytes

    ws.close()

    if not output_images:
        return None  # No image generated

    # Convert image bytes to Base64
    image_bytes = output_images[0]
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    print("Generated Image Data:", len(output_images), "images received")
    #Base64 Image URL
    return f"data:image/png;base64,{base64_image}" 

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_image():
    #API endpoint to generate an image based on the user's prompt.
    try:
        prompt_text = request.json.get("prompt")
        if not prompt_text:
            return jsonify({"status": "error", "message": "⚠️ Prompt is missing"}), 400

        prompt_data = json.loads(json.dumps(PROMPT_TEMPLATE))  
        prompt_data["6"]["inputs"]["text"] = prompt_text

        #Get image using WebSockets
        image_url = get_images_via_websocket(prompt_data)
        if not image_url:
            return jsonify({"status": "error", "message": "❌ Image generation failed!"}), 500

        return jsonify({"status": "success", "image_url": image_url}), 200

    except Exception as e:
        logging.error(f"Error during image generation: {e}")
        return jsonify({"status": "error", "message": "❌ Failed to generate image"}), 500

if __name__ == "__main__":
    app.run(debug=True)
