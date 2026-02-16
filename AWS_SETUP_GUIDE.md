# AWS Setup Guide - Task Tracker Database Integration

This guide provides step-by-step instructions to set up AWS services for the Daily Task Tracker application to store task data in DynamoDB.

## Architecture Overview

```
MyBlog Frontend (JavaScript)
    ↓
API Gateway (REST API)
    ↓
Lambda Function (Python)
    ↓
DynamoDB (Database)
```

## Prerequisites

- AWS Account with appropriate permissions
- Access to AWS Management Console
- All AWS services in the same region (e.g., us-east-1)

---

## Step 1: Create DynamoDB Table

### 1.1 Navigate to DynamoDB

1. Open [AWS Management Console](https://console.aws.amazon.com/)
2. Search for "DynamoDB" in the search bar
3. Click on "DynamoDB" service

### 1.2 Create Table

1. Click on "Create table" button
2. Enter Table details:

   | Field | Value |
   |-------|-------|
   | Table name | `TaskTrackerTable` |
   | Partition key | `date` (String) |
   | Sort key | `timestamp` (String) |

3. Click "Create table"

### 1.3 Wait for Table Creation

- Status will change from "Creating" to "Active"
- Note the **Table ARN** - you'll need this for Lambda permissions

### 1.4 Table Details (for reference)

```
Table Name: TaskTrackerTable
Partition Key: date (String) - e.g., "2026-02-15"
Sort Key: timestamp (String) - e.g., "2026-02-15T10:30:00Z"
```

---

## Step 2: Create IAM Role for Lambda

### 2.1 Navigate to IAM

1. Search for "IAM" in AWS Management Console
2. Click on "IAM" service
3. Click on "Roles" in left sidebar

### 2.2 Create Role

1. Click "Create role" button
2. Select "AWS service" as trusted entity type
3. Search for and select "Lambda"
4. Click "Next"

### 2.3 Attach Policy

1. Search for "DynamoDB" in permissions
2. Check the box for `AmazonDynamoDBFullAccess`
3. Click "Next"

### 2.4 Name Role

1. Role name: `TaskTrackerLambdaRole`
2. Click "Create role"

### 2.5 Verify Role

- Note the **Role ARN** (you'll see it after creation)
- Example: `arn:aws:iam::123456789:role/TaskTrackerLambdaRole`

---

## Step 3: Create Lambda Function

### 3.1 Navigate to Lambda

1. Search for "Lambda" in AWS Management Console
2. Click on "Lambda" service
3. Click "Create function" button

### 3.2 Configure Function

1. Select "Author from scratch"
2. Function details:

   | Field | Value |
   |-------|-------|
   | Function name | `task-tracker-function` |
   | Runtime | `Python 3.11` |
   | Architecture | `x86_64` |
   | Execution role | Select "Use an existing role" |
   | Role | `TaskTrackerLambdaRole` |

3. Click "Create function"

### 3.3 Add Lambda Code

1. Scroll down to "Code source" section
2. Delete the default code in `lambda_function.py`
3. Copy the entire code from `/aws/lambda_function.py` in this project
4. Paste it into the Lambda editor

### 3.4 Set Environment Variables

1. Scroll down to "Environment variables"
2. Click "Edit"
3. Add variables:

   | Key | Value |
   |-----|-------|
   | DYNAMODB_TABLE | `TaskTrackerTable` |
   | AWS_REGION | `us-east-1` (or your region) |

4. Click "Save"

### 3.5 Deploy Function

1. Click "Deploy" button at top
2. Wait for deployment to complete
3. Copy the **Function ARN** (shown at top right)

### 3.6 Verify Lambda Permissions

1. Click on "Configuration" tab
2. Go to "Permissions" section
3. Verify the role has DynamoDB access

---

## Step 4: Create API Gateway

### 4.1 Navigate to API Gateway

1. Search for "API Gateway" in AWS Management Console
2. Click on "API Gateway" service
3. Click "Create API" button

### 4.2 Choose API Type

1. Look for "REST API" option
2. Click "Build" button next to "REST API"

### 4.3 Create API

1. API details:

   | Field | Value |
   |-------|-------|
   | API name | `task-tracker-api` |
   | Description | `API for Task Tracker application` |
   | Endpoint Type | `Regional` |

2. Click "Create API"

### 4.4 Create Resource

1. Click on "Resources" in left sidebar
2. Click on "/" (root resource)
3. Click "Create resource" button
4. Resource name: `tasks`
5. Resource path: `/tasks` (auto-filled)
6. Click "Create resource"

### 4.5 Create POST Method

1. With `/tasks` resource selected
2. Click "Create method" button
3. Select "POST" from dropdown
4. Click "Create"

### 4.6 Configure POST Method

1. Method execution details:
   - Integration type: `Lambda Function`
   - Lambda Region: Select your region (e.g., `us-east-1`)
   - Lambda Function: Search for `task-tracker-function`
   - Check "Use Lambda Proxy integration"

2. Click "Create"

### 4.7 Enable CORS

1. Go back to "Resources"
2. Select `/tasks` resource
3. Click "Actions" dropdown
4. Select "Enable CORS"
5. Click "Enable CORS and replace existing CORS headers"
6. On confirmation, click "Yes, replace existing values"

### 4.8 Deploy API

1. Click "Actions" dropdown
2. Select "Deploy API"
3. Deployment stage:
   - Create new stage: `prod`
   - Click "Deploy"

### 4.9 Get API Endpoint

1. After deployment, you'll see the stage editor
2. Look for the **Invoke URL** at the top
3. The URL will look like:
   ```
   https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
   ```
4. Your POST endpoint will be:
   ```
   https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/tasks
   ```

**Copy this URL - you'll need it in the next step!**

---

## Step 5: Configure Frontend Application

### 5.1 Update API Configuration

1. Open `/pages/api-config.js` in your project
2. Replace the placeholder endpoint:

   ```javascript
   window.API_CONFIG = {
       endpoint: 'https://YOUR_API_GATEWAY_ENDPOINT_URL_HERE'
   };
   ```

   With your actual endpoint:

   ```javascript
   window.API_CONFIG = {
       endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/tasks'
   };
   ```

3. Save the file

---

## Step 6: Test the Integration

### 6.1 Local Testing

1. Open your web browser
2. Navigate to your Daily Task Tracker page (local or deployed)
3. Create some tasks
4. Click "Submit Tasks for Today" button

### 6.2 Verify Success

Expected behavior:
- Button shows "⏳ Submitting..." while processing
- Message appears: "✅ Tasks submitted successfully!"
- Toast notification: "Tasks saved to database!"

### 6.3 Check DynamoDB

1. Go to AWS Console → DynamoDB
2. Select "TaskTrackerTable"
3. Click "Explore table items"
4. You should see entries with your submitted tasks

### 6.4 Troubleshooting

#### If you see CORS errors:
- Go back to API Gateway
- Select `/tasks` resource
- Click "Actions" → "Enable CORS" again
- Redeploy the API

#### If you see "API endpoint not configured":
- Verify `api-config.js` has the correct endpoint
- Check browser console for errors (F12 → Console)

#### If Lambda shows errors:
- Check Lambda CloudWatch Logs:
  - Go to Lambda → Select function
  - Click "Monitor" tab
  - Click "View logs in CloudWatch"
- Common issues:
  - Table name doesn't match
  - Lambda doesn't have DynamoDB permissions
  - Wrong region in environment variables

---

## Data Structure

### Request Format

```json
{
  "date": "2026-02-15",
  "timestamp": "2026-02-15T10:30:00Z",
  "tasks": [
    {
      "id": 1,
      "name": "Morning Workout",
      "category": "Exercise",
      "status": "Completed",
      "period": "day",
      "startDate": "2026-02-15",
      "endDate": "2026-02-15"
    },
    {
      "id": 2,
      "name": "Study Python",
      "category": "Study",
      "status": "In-progress",
      "period": "week",
      "startDate": "2026-02-10",
      "endDate": "2026-02-16"
    }
  ]
}
```

### DynamoDB Item Structure

```json
{
  "date": "2026-02-15",
  "timestamp": "2026-02-15T10:30:00Z",
  "createdAt": "2026-02-15T10:30:45.123Z",
  "tasks": [...],
  "taskCount": 2,
  "summary": {
    "total": 2,
    "assigned": 0,
    "inProgress": 1,
    "completed": 1,
    "byCategory": {
      "Chores": 0,
      "Exercise": 1,
      "Study": 1,
      "Other": 0
    }
  }
}
```

---

## Security Best Practices

1. **API Gateway Security**
   - Consider adding API key requirements
   - Use AWS WAF for protection
   - Enable CloudWatch logging

2. **Lambda Security**
   - Use minimal IAM permissions
   - Enable VPC if needed
   - Monitor execution logs

3. **DynamoDB Security**
   - Enable Point-in-time Recovery
   - Enable encryption at rest
   - Use appropriate read/write capacity

4. **Frontend Security**
   - Never commit API endpoints to public repos
   - Use environment variables in production
   - Implement request validation

---

## Monitoring and Logging

### View Lambda Logs

1. Go to Lambda → Select function
2. Click "Monitor" tab
3. Click "View logs in CloudWatch"
4. Check recent log streams

### View API Requests

1. Go to API Gateway → Select API
2. Click "Logs" in left sidebar
3. Check CloudWatch logs for request/response data

### Monitor DynamoDB

1. Go to DynamoDB → Select table
2. Click "Metrics" tab
3. Monitor:
   - Read/Write capacity usage
   - Item count
   - Latency

---

## Troubleshooting Checklist

- [ ] DynamoDB table created with correct keys
- [ ] Lambda function has DynamoDB permissions
- [ ] Lambda environment variables set correctly
- [ ] API Gateway POST method integrated with Lambda
- [ ] CORS enabled on API Gateway
- [ ] API Gateway deployed to a stage
- [ ] Frontend `api-config.js` has correct endpoint URL
- [ ] Browser can reach the API endpoint
- [ ] Lambda logs show no errors

---

## Additional Resources

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS Lambda with Python](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)
- [API Gateway Integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
- [DynamoDB Boto3 Reference](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html)

---

## Next Steps

After successful integration, consider:

1. **Add authentication** - Secure the API with AWS Cognito
2. **Add query functionality** - Retrieve task history from DynamoDB
3. **Add data analytics** - Analyze task completion patterns
4. **Enable auto-scaling** - Handle increased traffic automatically
5. **Set up backups** - Enable DynamoDB backups

---

## Support

If you encounter issues:

1. Check CloudWatch logs for error messages
2. Verify all resource names match this guide
3. Ensure you're using the same AWS region throughout
4. Check IAM permissions for the Lambda role
5. Test Lambda with sample events in AWS Console

Happy task tracking! 🚀
