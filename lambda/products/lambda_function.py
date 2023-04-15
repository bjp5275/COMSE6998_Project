import os
import json
import uuid
import boto3
from decimal import Decimal
from project_utility import getQueryParameter, build_response, deserialize_dynamo_object, serialize_to_dynamo_object, toCoffeeTypeList, toMilkTypeList, COFFEE_TYPES, MILK_TYPES, validatePrice

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

def get_products(event, context):
    # Base filter expression and values
    filterExpression = '#TYPE = :type'
    filterExpressionValues = {
        ':type': {
            'S': PRODUCT_TYPE,
        },
    }
    expressionNames={
        '#TYPE': '_type'
    }

    # Check include_disabled flag
    include_disabled = getQueryParameter(event, INCLUDE_DISABLED_FLAG, 'false').lower() == 'true'
    
    # Filter out disabled items
    if not include_disabled:
        filterExpression = f"({filterExpression}) AND enabled = :enabled"
        filterExpressionValues[':enabled'] = {
            'BOOL': True,
        }
    

    print(f"Getting all products ({'including' if include_disabled else 'excluding'} disabled products)")
    response = dynamo.scan(
        TableName=PRODUCTS_TABLE,
        FilterExpression=filterExpression,
        ExpressionAttributeNames=expressionNames,
        ExpressionAttributeValues=filterExpressionValues,
    )
    products = response['Items']

    print(f"Found {len(products)} products")
    products = build_object_from_dynamo_response(products)
    all_additions = get_additions(None)
    for product in products:
        if 'allowedAdditions' in product:
            allowed_additions = []
            for id in product['allowedAdditions']:
                if id in all_additions:
                    allowed_additions.append(all_additions[id])
            product['allowedAdditions'] = allowed_additions
    return build_response(200, products)

def get_additions(addition_ids):
    if addition_ids is not None:
        keys = []
        for id in addition_ids:
            keys.append({
                'id': {
                    'S': id,
                }
            })

        response = dynamo.batch_get_item(
            RequestItems={
                PRODUCTS_TABLE: {
                    'Keys': keys
                },
            },
        )
        raw_additions = response['Responses'][PRODUCTS_TABLE]
    else:
        response = dynamo.scan(
            TableName=PRODUCTS_TABLE,
            FilterExpression='#TYPE = :type',
            ExpressionAttributeNames={
                '#TYPE': '_type'
            },
            ExpressionAttributeValues={
                ':type': {
                    'S': ADDITION_TYPE,
                },
            },
        )
        raw_additions = response['Items']

    additions = {}
    raw_additions = filter(lambda a: a['_type']['S'] == ADDITION_TYPE, raw_additions)
    for raw_addition in raw_additions:
        addition = deserialize_dynamo_object(raw_addition)
        additions[addition['id']] = addition
    
    return additions

def create_product(product):
    validated_product = {
        '_type': PRODUCT_TYPE
    }

    if 'id' in product:
        id = str(product['id'])
        print(f"Updating product {id}")
    else:
        id = str(uuid.uuid4())
        print(f"Creating product {id}", product)
    validated_product['id'] = id

    print("Validating product...")


    if 'enabled' in product:
        validated_product['enabled'] = str(product['enabled']).lower() == 'true'
    else:
        validated_product['enabled'] = True
    
    if 'name' in product:
        validated_product['name'] = str(product['name'])
    else:
        return False, None, 'Product must have a name'
    
    if 'basePrice' in product:
        basePrice = validatePrice(product['basePrice'])
        if basePrice is None:
            return False, None, 'Invalid base price'
        elif basePrice <= 0:
            return False, None, 'Base price must be non-negative'
        validated_product['basePrice'] = basePrice
    else:
        return False, None, 'Product must have a base price'
    
    if 'imageUrl' in product:
        validated_product['imageUrl'] = str(product['imageUrl'])
    else:
        return False, None, 'Product must have an image URL'

    if 'allowedCoffeeTypes' in product:
        coffeeTypes, invalidValues = toCoffeeTypeList(product['allowedCoffeeTypes'])
        if len(invalidValues) > 0:
            return False, None, f"Invalid coffee type(s): {', '.join(invalidValues)}. Known Types: {', '.join(COFFEE_TYPES)}"
        elif len(coffeeTypes) == 0:
            return False, None, 'Product must have at least one allowed coffee type'
        else:
            validated_product['allowedCoffeeTypes'] = coffeeTypes
    else:
        return False, None, 'Product must have at least one allowed coffee type'

    if 'allowedMilkTypes' in product:
        milkTypes, invalidValues = toMilkTypeList(product['allowedMilkTypes'])
        if len(invalidValues) > 0:
            return False, None, f"Invalid milk type(s): {', '.join(invalidValues)}. Known Types: {', '.join(MILK_TYPES)}"
        elif len(milkTypes) > 0:
            validated_product['allowedMilkTypes'] = milkTypes

    if 'allowedAdditions' in product:
        additions = product['allowedAdditions']
        addition_ids = []
        for addition in additions:
            if 'id' not in addition:
                return False, None, 'All product additions must be identified by ID'
            addition_ids.append(addition['id'])
        
        addition_mapping = get_additions(addition_ids)
        allowed_additions = []
        for id in addition_ids:
            if id not in addition_mapping:
                return False, None, f"Unknown product addition: {id}"
            allowed_additions.append(id)
        validated_product['allowedAdditions'] = allowed_additions

    print("Validated. Saving to Dynamo...", validated_product)

    dynamo.put_item(
        TableName=PRODUCTS_TABLE,
        Item=serialize_to_dynamo_object(validated_product)
    )

    print("Product saved")
    return True, validated_product, id

def upsert_product(event, context):
    if 'body' not in event or event['body'] is None:
        return build_response(400, 'Must specify a request body')
    
    input_product = json.loads(event['body'], parse_float=Decimal)
    success, product, data = create_product(input_product)

    if success:
        return build_response(200, product)
    else:
        return build_response(400, data)


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
    
    print("Response", response)
    return response