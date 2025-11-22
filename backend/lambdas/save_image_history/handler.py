import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'ImageHistory')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    """
    Lambda để lưu metadata ảnh vào DynamoDB
    Có thể gọi từ API Gateway hoặc từ Lambda khác
    """
    try:
        # Parse body nếu từ API Gateway
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        user_id = body.get('userId')
        original_key = body.get('originalKey')
        processed_key = body.get('processedKey')
        metadata = body.get('metadata', {})
        
        if not user_id or not processed_key:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'userId and processedKey are required'
                })
            }
        
        # Tạo timestamp
        timestamp = datetime.utcnow().isoformat()
        
        # Convert float/int to Decimal cho DynamoDB
        def convert_to_decimal(obj):
            if isinstance(obj, dict):
                return {k: convert_to_decimal(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_decimal(item) for item in obj]
            elif isinstance(obj, float) or isinstance(obj, int):
                return Decimal(str(obj))
            return obj
        
        metadata = convert_to_decimal(metadata)
        
        # Tạo item
        item = {
            'userId': user_id,
            'timestamp': timestamp,
            'originalKey': original_key or '',
            'processedKey': processed_key,
            'metadata': metadata,
            'ttl': int(datetime.utcnow().timestamp()) + (90 * 24 * 60 * 60)  # 90 ngày
        }
        
        # Lưu vào DynamoDB
        table.put_item(Item=item)
        
        print(f"Saved history for user {user_id} at {timestamp}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Image history saved successfully',
                'timestamp': timestamp
            })
        }
        
    except Exception as e:
        print(f"Error saving image history: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': f'Failed to save image history: {str(e)}'
            })
        }
