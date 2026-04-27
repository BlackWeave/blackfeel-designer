import argparse
import os
import requests
from io import BytesIO
from PIL import Image
from dotenv import dotenv_values
import fal_client


def main():
    parser = argparse.ArgumentParser(description="Enhance an image to 4k 300 DPI using fal-ai/esrgan")
    parser.add_argument("input_image", help="Path to the input local image file")
    parser.add_argument("-o", "--output", help="Path to save the enhanced output PNG file (defaults to <input>_enhanced.png)")
    parser.add_argument("--no-rembg", action="store_true", help="Skip local background removal step")
    args = parser.parse_args()

    # Determine output path: use provided arg or generate unique name from input
    if args.output:
        output_path = args.output
    else:
        base, _ = os.path.splitext(os.path.basename(args.input_image))
        output_path = f"{base}_enhanced.png"

    # 1. Strict dotenv loading: Bypassing standard os.environ inheritance 
    # to explicitly extract the API key from the .env file.
    env_config = dotenv_values(".env")
    fal_key = env_config.get("FAL_KEY")
    
    if not fal_key:
        print("❌ Error: FAL_KEY not found in .env file.")
        return
        
    # Inject it directly so fal_client can pick it up under the hood
    os.environ["FAL_KEY"] = fal_key

    try:
        # 2. Upload the local file to fal's temporary CDN storage
        print(f"⏳ Uploading '{args.input_image}' to fal storage...")
        image_url = fal_client.upload_file(args.input_image)

        # 3. Call the ESRGAN Model
        print("🧠 Enhancing image via fal-ai/esrgan...")
        result = fal_client.subscribe(
            "fal-ai/esrgan",
            arguments={
                "image_url": image_url,
                "output_format": "png",
                "scale": 4  # Typical upscale factor for Real-ESRGAN
            }
        )
        
        enhanced_url = result["image"]["url"]

        # 4. Download output and enforce exact 4K / 300 DPI constraints
        print("📏 Processing final 4K / 300 DPI transformation...")
        response = requests.get(enhanced_url)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content))
        
        # 4K sizing logic: Proportional scaling based on 3840px longest edge
        w, h = img.size
        target_dim = 3840
        
        if w >= h:
            new_w = target_dim
            new_h = int(h * (target_dim / w))
        else:
            new_h = target_dim
            new_w = int(w * (target_dim / h))
            
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # 5. Background Removal (Local)
        if not args.no_rembg:
            import rembg
            print("✂️ Removing background via rembg...")
            img = rembg.remove(img)
        else:
            print("⏭️ Skipping background removal...")
        
        # Save output applying the 300 DPI metadata
        img.save(output_path, format="PNG", dpi=(300, 300), resunit=2)
        print(f"✅ Success! Enhanced image saved to '{output_path}'")
        
    except FileNotFoundError:
        print(f"❌ Error: Could not find the input image '{args.input_image}'")
    except requests.exceptions.RequestException as e:
        print(f"❌ Network Error downloading the final image: {e}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()