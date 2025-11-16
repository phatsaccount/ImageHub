"""
Local testing script for Presigned URL Lambda
Run: python test_presigned_url.py
"""

import json
import sys
import os

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../lambdas/get_presigned_url'))

from handler import validate_request, generate_object_key


def test_validate_request_valid():
    """Test validation with valid request"""
    print("Testing valid request validation...")
    
    body = {
        'filename': 'test.jpg',
        'contentType': 'image/jpeg',
        'width': 800,
        'height': 600,
        'quality': 85,
        'format': 'jpeg'
    }
    
    errors = validate_request(body)
    assert len(errors) == 0, f"Expected no errors, got: {errors}"
    
    print("✓ Valid request test passed")


def test_validate_request_invalid():
    """Test validation with invalid request"""
    print("Testing invalid request validation...")
    
    body = {
        'filename': '',
        'contentType': 'image/gif',
        'width': 5000,
        'quality': 101
    }
    
    errors = validate_request(body)
    assert len(errors) > 0, "Expected validation errors"
    
    print(f"✓ Invalid request test passed (found {len(errors)} errors)")


def test_generate_object_key():
    """Test S3 object key generation"""
    print("Testing object key generation...")
    
    key = generate_object_key(
        filename='test photo.jpg',
        width=800,
        height=600,
        quality=85,
        output_format='jpeg',
        watermark='ImageHub'
    )
    
    assert 'uploads/' in key
    assert '800x600' in key
    assert '85' in key
    assert 'jpeg' in key
    assert 'ImageHub' in key
    assert 'test_photo.jpg' in key
    
    print(f"✓ Generated key: {key}")


def test_generate_object_key_no_watermark():
    """Test object key generation without watermark"""
    print("Testing object key without watermark...")
    
    key = generate_object_key(
        filename='test.jpg',
        width=1024,
        height=768,
        quality=90,
        output_format='png',
        watermark=None
    )
    
    assert 'none' in key
    assert 'png' in key
    
    print(f"✓ Generated key: {key}")


def test_mock_api_gateway_event():
    """Test with mock API Gateway event"""
    print("Testing API Gateway event...")
    
    event = {
        'body': json.dumps({
            'filename': 'photo.jpg',
            'contentType': 'image/jpeg',
            'width': 800,
            'height': 600,
            'quality': 85,
            'format': 'jpeg',
            'watermark': 'ImageHub'
        })
    }
    
    body = json.loads(event.get('body', '{}'))
    errors = validate_request(body)
    
    assert len(errors) == 0
    print("✓ Mock event test passed")


if __name__ == '__main__':
    print("=" * 50)
    print("Testing Presigned URL Lambda")
    print("=" * 50)
    print()
    
    try:
        test_validate_request_valid()
        test_validate_request_invalid()
        test_generate_object_key()
        test_generate_object_key_no_watermark()
        test_mock_api_gateway_event()
        
        print()
        print("=" * 50)
        print("✓ All tests passed!")
        print("=" * 50)
    except Exception as e:
        print()
        print("=" * 50)
        print(f"✗ Test failed: {str(e)}")
        print("=" * 50)
        import traceback
        traceback.print_exc()
        raise
