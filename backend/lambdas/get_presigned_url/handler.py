"""
Lambda Function: Get Presigned URL
Trigger: API Gateway (HTTP POST)
Purpose: Generate presigned URL for secure S3 upload from frontend
"""

import boto3
import json
import os
import time
from urllib.parse import quote_plus

# Environment variables
SOURCE_BUCKET = os.environ.get('SOURCE_BUCKET', 'imagehub-source-images')
URL_EXPIRATION = int(os.environ.get('URL_EXPIRATION', '300'))  # 5 minutes
MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', '10485760'))  # 10MB

s3_client = boto3.client('s3')


def generate_object_key(filename, width, height, quality, output_format, watermark):
    """
    Generate S3 object key with metadata embedded
    Format: uploads/{timestamp}_{width}x{height}_{quality}_{format}_{watermark}_{filename}
    """
    timestamp = int(time.time())
    watermark_encoded = quote_plus(watermark) if watermark else 'none'
    
    # Sanitize filename
    safe_filename = filename.replace(' ', '_') 
    
    key = f"uploads/{timestamp}_{width}x{height}_{quality}_{output_format}_{watermark_encoded}_{safe_filename}"
    
    return key


def validate_request(body):
    """
    Validate request parameters
    """
    errors = []
    
    # Required fields
    if not body.get('filename'):
        errors.append('filename is required')
    
    if not body.get('contentType'):
        errors.append('contentType is required')
    
    # Validate content type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if body.get('contentType') not in allowed_types:
        errors.append(f'contentType must be one of: {", ".join(allowed_types)}')
    
    # Validate dimensions
    width = body.get('width', 800)
    height = body.get('height', 600)
    
    if not isinstance(width, int) or width < 1 or width > 4000:
        errors.append('width must be between 1 and 4000')
    
    if not isinstance(height, int) or height < 1 or height > 4000:
        errors.append('height must be between 1 and 4000')
    
    # Validate quality
    quality = body.get('quality', 85)
    if not isinstance(quality, int) or quality < 1 or quality > 100:
        errors.append('quality must be between 1 and 100')
    
    # Validate format
    allowed_formats = ['jpeg', 'png', 'webp']
    output_format = body.get('format', 'jpeg')
    if output_format not in allowed_formats:
        errors.append(f'format must be one of: {", ".join(allowed_formats)}')
    
    return errors


def handler(event, context):
    """
    Main Lambda handler function
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        print(f"Request body: {body}")
        
        # Validate request
        errors = validate_request(body)
        if errors:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Validation failed',
                    'errors': errors
                })
            }
        
        # Extract parameters
        filename = body['filename']
        content_type = body['contentType']
        width = body.get('width', 800)
        height = body.get('height', 600)
        quality = body.get('quality', 85)
        output_format = body.get('format', 'jpeg')
        watermark = body.get('watermark', '')
        
        # Generate S3 object key with metadata
        object_key = generate_object_key(
            filename, width, height, quality, output_format, watermark
        )
        
        print(f"Generated object key: {object_key}")
        
        # Generate presigned URL
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': SOURCE_BUCKET,
                'Key': object_key,
                'ContentType': content_type,
            },
            ExpiresIn=URL_EXPIRATION,
            HttpMethod='PUT'
        )
        
        #  print(f"Generated presigned URL for: {object_key}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': object_key,
                'expiresIn': URL_EXPIRATION
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Invalid JSON in request body'
            })
        }
        
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Error generating upload URL',
                'error': str(e)
            })
        }


def options_handler(event, context):
    """
    Handle CORS preflight requests
    """
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': ''
    }
