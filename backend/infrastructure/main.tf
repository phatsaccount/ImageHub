# Terraform Configuration for ImageHub Serverless Infrastructure
# This file defines all AWS resources needed for the image processing system

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "imagehub"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# S3 Bucket for Source Images
resource "aws_s3_bucket" "source_images" {
  bucket = "${var.project_name}-source-images-${var.environment}"
  
  tags = {
    Name        = "ImageHub Source Images"
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3 Bucket for Processed Images
resource "aws_s3_bucket" "processed_images" {
  bucket = "${var.project_name}-processed-images-${var.environment}"
  
  tags = {
    Name        = "ImageHub Processed Images"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Enable versioning for source bucket
resource "aws_s3_bucket_versioning" "source_versioning" {
  bucket = aws_s3_bucket.source_images.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy for source images (delete after 7 days)
resource "aws_s3_bucket_lifecycle_configuration" "source_lifecycle" {
  bucket = aws_s3_bucket.source_images.id

  rule {
    id     = "delete-old-uploads"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}

# Public access settings for processed images bucket
resource "aws_s3_bucket_public_access_block" "processed_public_access" {
  bucket = aws_s3_bucket.processed_images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy for public read access to processed images
resource "aws_s3_bucket_policy" "processed_bucket_policy" {
  bucket = aws_s3_bucket.processed_images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.processed_images.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.processed_public_access]
}

# CORS configuration for source bucket
resource "aws_s3_bucket_cors_configuration" "source_cors" {
  bucket = aws_s3_bucket.source_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# IAM Role for Image Processor Lambda
resource "aws_iam_role" "image_processor_role" {
  name = "${var.project_name}-image-processor-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "ImageHub Image Processor Role"
    Environment = var.environment
  }
}

# IAM Policy for Image Processor Lambda
resource "aws_iam_role_policy" "image_processor_policy" {
  name = "${var.project_name}-image-processor-policy"
  role = aws_iam_role.image_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.source_images.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.processed_images.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM Role for Presigned URL Lambda
resource "aws_iam_role" "presigned_url_role" {
  name = "${var.project_name}-presigned-url-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "ImageHub Presigned URL Role"
    Environment = var.environment
  }
}

# IAM Policy for Presigned URL Lambda
resource "aws_iam_role_policy" "presigned_url_policy" {
  name = "${var.project_name}-presigned-url-policy"
  role = aws_iam_role.presigned_url_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.source_images.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda Function: Image Processor
# Note: You need to create a deployment package first
resource "aws_lambda_function" "image_processor" {
  filename         = "${path.module}/../deployment/image_processor.zip"
  function_name    = "${var.project_name}-image-processor-${var.environment}"
  role            = aws_iam_role.image_processor_role.arn
  handler         = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../deployment/image_processor.zip")
  runtime         = "python3.11"
  timeout         = 60
  memory_size     = 512

  environment {
    variables = {
      PROCESSED_BUCKET = aws_s3_bucket.processed_images.bucket
      DEFAULT_WIDTH    = "800"
      DEFAULT_HEIGHT   = "600"
      DEFAULT_QUALITY  = "85"
    }
  }

  tags = {
    Name        = "ImageHub Image Processor"
    Environment = var.environment
  }
}

# Lambda Function: Presigned URL Generator
resource "aws_lambda_function" "presigned_url" {
  filename         = "${path.module}/../deployment/presigned_url.zip"
  function_name    = "${var.project_name}-presigned-url-${var.environment}"
  role            = aws_iam_role.presigned_url_role.arn
  handler         = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../deployment/presigned_url.zip")
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      SOURCE_BUCKET  = aws_s3_bucket.source_images.bucket
      URL_EXPIRATION = "300"
      MAX_FILE_SIZE  = "10485760"
    }
  }

  tags = {
    Name        = "ImageHub Presigned URL"
    Environment = var.environment
  }
}

# S3 Bucket Notification to trigger Lambda
resource "aws_s3_bucket_notification" "source_bucket_notification" {
  bucket = aws_s3_bucket.source_images.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# Lambda permission for S3 to invoke Image Processor
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.source_images.arn
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "ImageHub API for uploading images"

  tags = {
    Name        = "ImageHub API"
    Environment = var.environment
  }
}

# API Gateway Resource
resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "upload"
}

# API Gateway Method: POST /upload
resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Method: OPTIONS /upload (for CORS)
resource "aws_api_gateway_method" "upload_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Integration: POST
resource "aws_api_gateway_integration" "upload_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.upload.id
  http_method             = aws_api_gateway_method.upload_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presigned_url.invoke_arn
}

# API Gateway Integration: OPTIONS
resource "aws_api_gateway_integration" "upload_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# API Gateway Method Response: OPTIONS
resource "aws_api_gateway_method_response" "upload_options_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# API Gateway Integration Response: OPTIONS
resource "aws_api_gateway_integration_response" "upload_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.upload.id
  http_method = aws_api_gateway_method.upload_options.http_method
  status_code = aws_api_gateway_method_response.upload_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.upload.id,
      aws_api_gateway_method.upload_post.id,
      aws_api_gateway_integration.upload_post_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.upload_post_integration,
    aws_api_gateway_integration.upload_options_integration
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "api_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.environment

  tags = {
    Name        = "ImageHub API Stage"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presigned_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# CloudFront Distribution for Processed Images
resource "aws_cloudfront_distribution" "processed_images_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "ImageHub CDN for processed images"
  default_root_object = ""

  origin {
    domain_name = aws_s3_bucket.processed_images.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.processed_images.bucket}"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.processed_images.bucket}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "ImageHub CDN"
    Environment = var.environment
  }
}

# Outputs
output "source_bucket_name" {
  description = "Name of the source images bucket"
  value       = aws_s3_bucket.source_images.bucket
}

output "processed_bucket_name" {
  description = "Name of the processed images bucket"
  value       = aws_s3_bucket.processed_images.bucket
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = "${aws_api_gateway_stage.api_stage.invoke_url}/upload"
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.processed_images_cdn.domain_name
}

output "cloudfront_url" {
  description = "CloudFront URL"
  value       = "https://${aws_cloudfront_distribution.processed_images_cdn.domain_name}"
}
