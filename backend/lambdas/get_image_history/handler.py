import json
import boto3
import os
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'ImageHistory')
bucket_name = os.environ.get('S3_BUCKET_NAME')
table = dynamodb.Table(table_name)

class DecimalEncoder(json.JSONEncoder):
    """Convert Decimal to int/float"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Lambda để lấy lịch sử ảnh của user
    Query: ?userId=xxx&limit=50
    """
    try:
        # Lấy userId từ query parameters
        user_id = None
        limit = 50
        
        if event.get('queryStringParameters'):
            user_id = event['queryStringParameters'].get('userId')
            limit = int(event['queryStringParameters'].get('limit', 50))
        elif event.get('userId'):
            user_id = event['userId']
            
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'userId is required'
                })
            }
        
        print(f"Fetching history for user: {user_id}, limit: {limit}")
        
        # Query DynamoDB
        response = table.query(
            KeyConditionExpression=Key('userId').eq(user_id),
            ScanIndexForward=False,  # Sắp xếp giảm dần theo timestamp (mới nhất trước)
            Limit=limit
        )
        
        items = response.get('Items', [])
        print(f"Found {len(items)} items")
        
        # Generate presigned URLs
        for item in items:
            # Presigned URL cho processed image
            if item.get('processedKey') and bucket_name:
                try:
                    item['processedUrl'] = s3.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': bucket_name,
                            'Key': item['processedKey']
                        },
                        ExpiresIn=3600  # 1 giờ
                    )
                except Exception as e:
                    print(f"Error generating presigned URL for {item['processedKey']}: {str(e)}")
                    item['processedUrl'] = None
            
            # Presigned URL cho original image (optional)
            if item.get('originalKey') and bucket_name and item['originalKey']:
                try:
                    item['originalUrl'] = s3.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': bucket_name,
                            'Key': item['originalKey']
                        },
                        ExpiresIn=3600
                    )
                except Exception as e:
                    print(f"Error generating presigned URL for original: {str(e)}")
                    item['originalUrl'] = None
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'count': len(items),
                'items': items,
                'userId': user_id
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error fetching image history: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'error': f'Failed to fetch image history: {str(e)}'
            })
        }
