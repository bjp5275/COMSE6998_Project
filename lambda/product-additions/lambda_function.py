import os
import json
import uuid
import boto3
from project_utility import build_response, deserialize_dynamo_object, serialize_to_dynamo_object

# Dynamo Tables
PRODUCTS_TABLE = os.environ['PRODUCTS_TABLE']

# Clients
dynamo = boto3.client('dynamodb')

# Constants
INCLUDE_DISABLED_FLAG = 'includeDisabled'
PRODUCT_TYPE = 'PRODUCT'
ADDITION_TYPE = 'ADDITION'


def build_object_from_dynamo_response(items):
    objects = []
    for item in items:
        obj = deserialize_dynamo_object(item)
        obj.pop('_type')
        objects.append(obj)
    return objects

def get_additions(event, context):
    # Base filter expression and values
    filterExpression = '_type = :type'
    filterExpressionValues = {
        ':type': {
            'S': ADDITION_TYPE,
        },
    }

    # Check include_disabled flag
    parameters = event['queryStringParameters']
    if INCLUDE_DISABLED_FLAG not in parameters:
        include_disabled = False
    else:
        include_disabled = parameters[INCLUDE_DISABLED_FLAG].lower() == 'true'
    
    # Filter out disabled items
    if not include_disabled:
        filterExpression = f"({filterExpression}) AND enabled = :enabled",
        filterExpressionValues[':enabled'] = {
            'BOOL': True,
        }
    

    print(f"Getting all additions ({'including' if include_disabled else 'excluding'} disabled additions)")
    response = dynamo.scan(
        TableName=PRODUCTS_TABLE,
        FilterExpression=filterExpression,
        ExpressionAttributeValues=filterExpressionValues,
    )
    additions = response['Items']

    print(f"Found {len(additions)} additions")
    additions = build_object_from_dynamo_response(additions)
    return build_response(200, additions)

def create_addition(addition):
    validated_addition = {
        '_type': ADDITION_TYPE
    }

    if 'id' in addition:
        id = str(addition['id'])
        print(f"Updating addition {id}")
    else:
        id = str(uuid.uuid4())
        print(f"Creating addition {id}", addition)
    validated_addition['id'] = id

    print("Validating addition...")

    if 'enabled' in addition:
        validated_addition['enabled'] = str(addition['enabled']).lower() == 'true'
    else:
        validated_addition['enabled'] = True
    
    if 'name' in addition:
        validated_addition['name'] = str(addition['name'])
    else:
        return False, None, 'Addition must have a name'
    
    if 'price' in addition:
        price = float(addition['price'])
        if price <= 0:
            return False, None, 'Price must be non-negative'
        validated_addition['price'] = price
    else:
        return False, None, 'Addition must have a price'

    print("Validated. Saving to Dynamo...", validated_addition)

    dynamo.put_item(
        TableName=PRODUCTS_TABLE,
        Item=serialize_to_dynamo_object(validated_addition)
    )

    print("Addition saved")
    return True, validated_addition, id

def upsert_addition(event, context):
    if 'body' not in event or event['body'] is None:
        return build_response(400, 'Must specify a request body')

    input_addition = json.loads(event['body'])
    success, addition, data = create_addition(input_addition)

    if success:
        return build_response(200, addition)
    else:
        return build_response(400, data)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")
    
    httpMethod = event['httpMethod']
    if httpMethod == 'GET':
        response = get_additions(event, context)
    elif httpMethod == 'POST':
        response = upsert_addition(event, context)
    else:
        response = build_response(500, f"Unknown method: {httpMethod}")
    
    return response