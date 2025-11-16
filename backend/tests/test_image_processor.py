"""
Local testing script for Image Processor Lambda
Run: python test_image_processor.py
"""

import json
import sys
import os

# Add lambda directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../lambdas/image_processor'))

from handler import handler, get_image_metadata, process_image

def test_get_image_metadata():
    """Test metadata parsing"""
    print("Testing metadata parsing...")
    
    key = "uploads/1699889234_800x600_85_jpeg_ImageHub_photo.jpg"
    metadata = get_image_metadata(key)
    
    assert metadata['width'] == 800
    assert metadata['height'] == 600
    assert metadata['quality'] == 85
    assert metadata['format'] == 'jpeg'
    assert metadata['watermark'] == 'ImageHub'
    
    print("✓ Metadata parsing test passed")


def test_invalid_metadata():
    """Test metadata parsing with invalid key"""
    print("Testing invalid metadata...")
    
    key = "invalid_key.jpg"
    metadata = get_image_metadata(key)
    
    # Should return defaults
    assert metadata['width'] == 800
    assert metadata['height'] == 600
    
    print("✓ Invalid metadata test passed")


def test_handler_event():
    """Test Lambda handler with mock S3 event"""
    print("Testing Lambda handler...")
    
    # Mock S3 event
    event = {
        'Records': [{
            's3': {
                'bucket': {
                    'name': 'test-source-bucket'
                },
                'object': {
                    'key': 'uploads/1699889234_800x600_85_jpeg_none_test.jpg'
                }
            }
        }]
    }
    
    # Note: This will fail without actual S3 access
    # For full testing, use localstack or moto
    print("Mock event created successfully")
    print(json.dumps(event, indent=2))


if __name__ == '__main__':
    print("=" * 50)
    print("Testing Image Processor Lambda")
    print("=" * 50)
    print()
    
    try:
        test_get_image_metadata()
        test_invalid_metadata()
        test_handler_event()
        
        print()
        print("=" * 50)
        print("✓ All tests passed!")
        print("=" * 50)
    except Exception as e:
        print()
        print("=" * 50)
        print(f"✗ Test failed: {str(e)}")
        print("=" * 50)
        raise
