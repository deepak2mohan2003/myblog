"""
AWS Lambda Function for Task Tracker
Receives task data from API Gateway and stores it in DynamoDB

Environment Variables Required:
- DYNAMODB_TABLE: Name of DynamoDB table (default: TaskTrackerTable)
- AWS_REGION: AWS region (default: us-east-1)
"""

import json
import boto3
import os
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
table_name = os.environ.get('DYNAMODB_TABLE', 'TaskTrackerTable')
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    """
    Main Lambda handler function
    Receives POST request with task data and stores in DynamoDB
    """

    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        # Extract data from request
        date = body.get('date')
        timestamp = body.get('timestamp')
        tasks = body.get('tasks', [])

        # Validation
        if not date or not tasks:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Missing required fields: date and tasks'
                })
            }

        # Process and store tasks
        response = store_tasks_in_dynamodb(date, timestamp, tasks)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }

    except json.JSONDecodeError as e:
        return error_response(400, f'Invalid JSON: {str(e)}')
    except Exception as e:
        print(f'Error: {str(e)}')
        return error_response(500, f'Internal server error: {str(e)}')


def store_tasks_in_dynamodb(date, timestamp, tasks):
    """
    Store tasks in DynamoDB

    Args:
        date (str): Date in YYYY-MM-DD format
        timestamp (str): ISO format timestamp
        tasks (list): List of task objects

    Returns:
        dict: Response object with success status
    """

    try:
        # Prepare item for DynamoDB
        item = {
            'date': date,  # Partition key
            'timestamp': timestamp,  # Sort key
            'createdAt': datetime.utcnow().isoformat(),
            'tasks': tasks,
            'taskCount': len(tasks),
            'summary': generate_task_summary(tasks)
        }

        # Put item in DynamoDB
        table.put_item(Item=item)

        return {
            'success': True,
            'message': f'Successfully saved {len(tasks)} tasks for {date}',
            'data': {
                'date': date,
                'taskCount': len(tasks),
                'timestamp': timestamp
            }
        }

    except Exception as e:
        print(f'DynamoDB Error: {str(e)}')
        raise


def generate_task_summary(tasks):
    """
    Generate summary statistics for tasks

    Args:
        tasks (list): List of task objects

    Returns:
        dict: Summary of task statuses
    """

    summary = {
        'total': len(tasks),
        'assigned': 0,
        'inProgress': 0,
        'completed': 0,
        'byCategory': {
            'Chores': 0,
            'Exercise': 0,
            'Study': 0,
            'Other': 0
        }
    }

    for task in tasks:
        status = task.get('status', 'Assigned')
        category = task.get('category', 'Other')

        # Count by status
        if status == 'Assigned':
            summary['assigned'] += 1
        elif status == 'In-progress':
            summary['inProgress'] += 1
        elif status == 'Completed':
            summary['completed'] += 1

        # Count by category
        if category in summary['byCategory']:
            summary['byCategory'][category] += 1
        else:
            summary['byCategory']['Other'] += 1

    return summary


def error_response(status_code, message):
    """
    Generate error response

    Args:
        status_code (int): HTTP status code
        message (str): Error message

    Returns:
        dict: Error response object
    """

    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': False,
            'message': message
        })
    }


# For local testing
if __name__ == '__main__':
    # Sample event for testing
    test_event = {
        'body': json.dumps({
            'date': '2026-02-15',
            'timestamp': '2026-02-15T10:30:00Z',
            'tasks': [
                {
                    'id': 1,
                    'name': 'Morning Workout',
                    'category': 'Exercise',
                    'status': 'Completed',
                    'period': 'day'
                },
                {
                    'id': 2,
                    'name': 'Study Python',
                    'category': 'Study',
                    'status': 'In-progress',
                    'period': 'week'
                },
                {
                    'id': 3,
                    'name': 'Clean Kitchen',
                    'category': 'Chores',
                    'status': 'Assigned',
                    'period': 'day'
                }
            ]
        })
    }

    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
