import os
import json
import boto3
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

# Dynamo Tables
PRODUCTS_TABLE = os.environ['PRODUCTS_TABLE']

# Clients
dynamo = boto3.client('dynamodb')

# Constants
INCLUDE_DISABLED_FLAG = 'includeDisabled'


def deserialize_dynamo_object(dynamo_obj):
    deserializer = TypeDeserializer()
    return {
        key: deserializer.deserialize(value) 
        for key, value in dynamo_obj.items()
    }  
  
def serialize_to_dynamo_object(obj):
    serializer = TypeSerializer()
    return {
        key: serializer.serialize(value)
        for key, value in obj.items()
    }

def build_products_from_dynamo_response(items):
    products = []
    for item in items:
        products.append(deserialize_dynamo_object(item))
    return products

def build_response(code, body):
    formatted_body = body
    if type(body) != str:
        formatted_body = json.dumps(body)
    
    return {
        'statusCode': code,
        'body': formatted_body,
        'headers': {
            "Access-Control-Allow-Origin": "*"
        }
    }

def get_products(event, context):
    parameters = event['queryStringParameters']
    if INCLUDE_DISABLED_FLAG not in parameters:
        include_disabled = False
    else:
        include_disabled = parameters[INCLUDE_DISABLED_FLAG].lower() == 'true'
    

    print(f"Getting all products ({'including' if include_disabled else 'excluding'} disabled products)")
    products = dynamo.scan(
        TableName=PRODUCTS_TABLE,
        FilterExpression='enabled = :enabled',
        ExpressionAttributeValues={
            ':enabled': {
                'BOOL': include_disabled,
            },
        },
    )

    print(f"Found {len(products)} products")
    products = build_products_from_dynamo_response(products)
    return build_response(200, products)

def upsert_product(event, context):
    return build_response(500, 'NOT IMPLEMENTED YET')


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")
    
    httpMethod = event['httpMethod']
    if httpMethod == 'GET':
        response = get_products(event, context)
    elif httpMethod == 'POST':
        response = upsert_product(event, context)
    else:
        response = build_response(500, f"Unknown method: {httpMethod}")
    
    return response