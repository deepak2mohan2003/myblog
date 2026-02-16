/**
 * API Configuration for Task Tracker
 *
 * Update the endpoint with your AWS API Gateway URL
 * This file contains the configuration for calling the AWS Lambda function
 */

window.API_CONFIG = {
    // Replace with your API Gateway endpoint URL
    // Format: https://xxxxxxxxxx.execute-api.region.amazonaws.com/stage/tasks
    // You'll get this URL when you create the API Gateway endpoint
    endpoint: 'https://YOUR_API_GATEWAY_ENDPOINT_URL_HERE',

    // Optional: Add headers or other configurations
    headers: {
        'Content-Type': 'application/json'
    }
};

/**
 * SETUP INSTRUCTIONS:
 *
 * 1. Create AWS DynamoDB Table:
 *    - Table Name: TaskTrackerTable
 *    - Partition Key: date (String)
 *    - Sort Key: timestamp (String)
 *
 * 2. Create IAM Role for Lambda:
 *    - Service: Lambda
 *    - Add policy: AmazonDynamoDBFullAccess
 *
 * 3. Create Lambda Function:
 *    - Runtime: Python 3.11
 *    - Paste the Python code from lambda_function.py
 *    - Attach IAM role created in step 2
 *
 * 4. Create API Gateway:
 *    - Type: REST API
 *    - Create new resource: /tasks
 *    - Create POST method
 *    - Integration type: Lambda Function
 *    - Select your Lambda function
 *    - Enable CORS
 *    - Deploy to a stage (e.g., 'prod')
 *
 * 5. Update this file:
 *    - Copy the API Endpoint URL from API Gateway
 *    - Replace 'https://YOUR_API_GATEWAY_ENDPOINT_URL_HERE' with the actual endpoint
 *    - Format: https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/tasks
 */
