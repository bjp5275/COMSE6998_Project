import os
import json
from decimal import Decimal, InvalidOperation
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

# Dynamo Tables
PRODUCTS_TABLE = os.environ['PRODUCTS_TABLE']
ORDERS_TABLE = os.environ['ORDERS_TABLE']

# Constants
PRODUCT_TYPE = 'PRODUCT'
ADDITION_TYPE = 'ADDITION'

def decimal_encoder(d):
    if isinstance(d, Decimal):
        return str(d)
    else:
        type_name = d.__class__.__name__
        raise TypeError(f"Object of type {type_name} is not serializable")

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

def _get_event_parameter(event, parameter_type, parameter_name, default_value):
    if parameter_type in event:
        parameters = event[parameter_type]
        if parameters is not None and name in parameters:
            return parameters[name]
    return default_value

def get_path_parameter(event, name, default_value):
    return _get_event_parameter(event, 'pathParameters', name, default_value)

def get_query_parameter(event, name, default_value):
    return _get_event_parameter(event, 'queryStringParameters', name, default_value)

def build_response(code, body):
    formatted_body = body
    if type(body) != str:
        formatted_body = json.dumps(body, default=decimal_encoder)
    
    return {
        'statusCode': code,
        'body': formatted_body,
        'headers': {
            "Access-Control-Allow-Origin": "*"
        }
    }

def build_error_response(error_code, message, code=400):
    error_response = {
        'code': error_code,
        'message': message
    }
    return build_response(code, error_response)

def validate_price(value):
    if value is not None:
        try:
            decimalValue = Decimal(value)
            # Ensure there is at most 2 decimal places
            if decimalValue.as_tuple().exponent >= -2:
                return decimalValue
        except InvalidOperation:
            pass
    
    return None

def validate_location(location, name):
    validated_location = {}

    if 'name' in location:
        validated_location['name'] = str(location['name'])

    if 'streetAddress' in location:
        validated_location['streetAddress'] = str(location['streetAddress'])
    else:
        return False, f"{name} must have a street address"

    if 'city' in location:
        validated_location['city'] = str(location['city'])
    else:
        return False, f"{name} must have a city"

    if 'state' in location:
        validated_location['state'] = str(location['state'])
    else:
        return False, f"{name} must have a state"

    if 'zip' in location:
        validated_location['zip'] = str(location['zip'])
    else:
        return False, f"{name} must have a zip"

    return True, validated_location

def validate_payment_information(payment_info, name):
    validated_payment_info = {}

    if 'nameOnCard' in payment_info:
        validated_payment_info['nameOnCard'] = str(payment_info['nameOnCard'])
    else:
        return False, f"{name} must have the name on the card"

    if 'cardNumber' in payment_info:
        validated_payment_info['cardNumber'] = str(payment_info['cardNumber'])
    else:
        return False, f"{name} must have the card number"

    if 'cvv' in payment_info:
        validated_payment_info['cvv'] = str(payment_info['cvv'])
    else:
        return False, f"{name} must have the CVV"

    return True, validated_payment_info

def to_enum_string(value, valid_values):
    if value is not None:
        normalized_value = str(value).upper()
        if normalized_value in valid_values:
            return normalized_value
    return None

def to_enum_list(list_value, valid_enum_values):
    if list_value is None or len(list_value) == 0:
        return [], []
    else:
        valid_values = []
        invalid_values = []
        for value in list_value:
            normalized = to_enum_string(value, valid_enum_values)
            if normalized is not None:
                valid_values.append(normalized)
            else:
                invalid_values.append(value)
        return valid_values, invalid_values


COFFEE_TYPES = ['REGULAR', 'DECAF']
def to_coffee_type(coffee_type):
    return to_enum_string(coffee_type, COFFEE_TYPES)

def to_coffee_type_list(coffee_types):
    return to_enum_list(coffee_types, COFFEE_TYPES)
            

MILK_TYPES = ['REGULAR', 'SKIM', 'OAT', 'ALMOND']
def to_milk_type(milk_type):
    return to_enum_string(milk_type, MILK_TYPES)

def to_milk_type_list(milk_types):
    return to_enum_list(milk_types, MILK_TYPES)

def get_additions_by_id(dynamo, addition_ids):
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
        addition.pop('_type')
        additions[addition['id']] = addition
    
    return additions

def get_products_by_id(dynamo, product_ids):
    if product_ids is not None:
        keys = []
        for id in product_ids:
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
        raw_products = response['Responses'][PRODUCTS_TABLE]
    else:
        response = dynamo.scan(
            TableName=PRODUCTS_TABLE,
            FilterExpression='#TYPE = :type',
            ExpressionAttributeNames={
                '#TYPE': '_type'
            },
            ExpressionAttributeValues={
                ':type': {
                    'S': PRODUCT_TYPE,
                },
            },
        )
        raw_products = response['Items']

    products = {}
    raw_products = filter(lambda p: p['_type']['S'] == PRODUCT_TYPE, raw_products)
    for raw_product in raw_products:
        product = deserialize_dynamo_object(raw_product)
        product.pop('_type')
        products[product['id']] = product
    
    return products
