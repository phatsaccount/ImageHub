"""
Lambda Function: Image Processor
Trigger: S3 Event (ObjectCreated) from source-images bucket
Purpose: Resize, add watermark, convert format, and upload to processed-images bucket
"""

import boto3
import json
import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from urllib.parse import unquote_plus

# Environment variables
PROCESSED_BUCKET = os.environ.get('PROCESSED_BUCKET', 'imagehub-processed-images')
DEFAULT_WIDTH = int(os.environ.get('DEFAULT_WIDTH', '800'))
DEFAULT_HEIGHT = int(os.environ.get('DEFAULT_HEIGHT', '600'))
DEFAULT_QUALITY = int(os.environ.get('DEFAULT_QUALITY', '85'))

s3_client = boto3.client('s3')


def get_image_metadata(key):
    """
    Parse image metadata from S3 object key
    Expected format: uploads/{timestamp}_{width}x{height}_{quality}_{format}_{watermark}_{filename}
    Example: uploads/1699889234_800x600_85_jpeg_ImageHub_photo.jpg
    """
    try:
        parts = key.split('/')[-1].split('_')
        if len(parts) >= 5:
            width, height = map(int, parts[1].split('x'))
            quality = int(parts[2])
            output_format = parts[3]
            watermark_text = unquote_plus(parts[4]) if parts[4] != 'none' else None
            return {
                'width': width,
                'height': height,
                'quality': quality,
                'format': output_format,
                'watermark': watermark_text
            }
    except Exception as e:
        print(f"Error parsing metadata: {str(e)}, using defaults")
    
    # Return defaults if parsing fails
    return {
        'width': DEFAULT_WIDTH,
        'height': DEFAULT_HEIGHT,
        'quality': DEFAULT_QUALITY,
        'format': 'jpeg',
        'watermark': None
    }


def add_watermark(image, text, opacity=128):
    """
    Add watermark text to image
    """
    # Create a new image for the watermark with transparency
    watermark = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(watermark)
    
    # Try to use a better font, fallback to default if not available
    try:
        font_size = int(image.size[0] * 0.05)  # 5% of image width
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position (bottom right corner with padding)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    padding = 20
    position = (
        image.size[0] - text_width - padding,
        image.size[1] - text_height - padding
    )
    
    # Draw watermark with semi-transparent white color
    draw.text(position, text, font=font, fill=(255, 255, 255, opacity))
    
    # Composite watermark onto original image
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    watermarked = Image.alpha_composite(image, watermark)
    
    # Convert back to RGB if needed
    if watermarked.mode == 'RGBA':
        background = Image.new('RGB', watermarked.size, (255, 255, 255))
        background.paste(watermarked, mask=watermarked.split()[3])
        return background
    
    return watermarked


def process_image(image_bytes, metadata):
    """
    Process image: resize, add watermark, convert format
    """
    # Open image
    image = Image.open(BytesIO(image_bytes))
    
    # Convert RGBA to RGB if output format is JPEG
    if metadata['format'].lower() in ['jpeg', 'jpg'] and image.mode == 'RGBA':
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3] if len(image.split()) == 4 else None)
        image = background
    
    # Resize image while maintaining aspect ratio
    image.thumbnail((metadata['width'], metadata['height']), Image.Resampling.LANCZOS)
    
    # Add watermark if specified
    if metadata['watermark']:
        image = add_watermark(image, metadata['watermark'])
    
    # Save to bytes
    output = BytesIO()
    save_format = metadata['format'].upper()
    if save_format == 'JPG':
        save_format = 'JPEG'
    
    save_kwargs = {'format': save_format}
    if save_format == 'JPEG':
        save_kwargs['quality'] = metadata['quality']
        save_kwargs['optimize'] = True
    elif save_format == 'PNG':
        save_kwargs['optimize'] = True
    elif save_format == 'WEBP':
        save_kwargs['quality'] = metadata['quality']
    
    image.save(output, **save_kwargs)
    output.seek(0)
    
    return output.getvalue()


def handler(event, context):
    """
    Main Lambda handler function
    """
    try:
        # Get the S3 event details
        record = event['Records'][0]
        source_bucket = record['s3']['bucket']['name']
        source_key = unquote_plus(record['s3']['object']['key'])
        
        print(f"Processing image: {source_key} from bucket: {source_bucket}")
        
        # Download image from S3
        response = s3_client.get_object(Bucket=source_bucket, Key=source_key)
        image_bytes = response['Body'].read()
        
        # Get processing metadata
        metadata = get_image_metadata(source_key)
        print(f"Processing with metadata: {metadata}")
        
        # Process image
        processed_image = process_image(image_bytes, metadata)
        
        # Generate output key
        original_filename = source_key.split('/')[-1]
        # Remove metadata prefix from filename
        clean_filename = '_'.join(original_filename.split('_')[5:]) if '_' in original_filename else original_filename
        output_key = f"processed/{clean_filename.rsplit('.', 1)[0]}.{metadata['format']}"
        
        # Upload processed image to destination bucket
        content_type_mapping = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        }
        content_type = content_type_mapping.get(metadata['format'].lower(), 'image/jpeg')
        
        s3_client.put_object(
            Bucket=PROCESSED_BUCKET,
            Key=output_key,
            Body=processed_image,
            ContentType=content_type,
            CacheControl='max-age=31536000'  # Cache for 1 year
        )
        
        print(f"Successfully processed and uploaded to: {output_key}")
        
        # Return CloudFront/S3 URL
        processed_url = f"https://{PROCESSED_BUCKET}.s3.amazonaws.com/{output_key}"
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Image processed successfully',
                'processed_url': processed_url,
                'output_key': output_key,
                'metadata': metadata
            })
        }
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error processing image',
                'error': str(e)
            })
        }
