from flask import Flask, request, jsonify
from rembg import remove
import base64
from io import BytesIO
from PIL import Image

app = Flask(__name__)

@app.route('/remove-bg', methods=['POST'])
def remove_background():
    print("🐍 Received request to remove background...")
    try:
        data = request.json
        base64_img = data.get('image')
        
        if not base64_img:
            return jsonify({"error": "No image provided"}), 400

        # 1. Clean the base64 string and decode it
        if ',' in base64_img:
            base64_img = base64_img.split(',')[1]
        
        img_data = base64.b64decode(base64_img)
        input_image = Image.open(BytesIO(img_data))

        # 2. Process with rembg (this is the magic)
        output_image = remove(input_image)

        # 3. Convert back to base64
        buffered = BytesIO()
        output_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        print("✅ Background removed successfully!")
        return jsonify({"image": f"data:image/png;base64,{img_str}"})

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Running on port 5001 so it doesn't conflict with your Node server
    app.run(port=5001)