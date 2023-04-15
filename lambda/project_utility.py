import json
from decimal import Decimal, InvalidOperation
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

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

def getQueryParameter(event, name, defaultValue):
    if 'queryStringParameters' in event:
        parameters = event['queryStringParameters']
        if parameters is not None and name in parameters:
            return parameters[name]
    return defaultValue

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

def validatePrice(value):
    if value is not None:
        try:
            decimalValue = Decimal(value)
            # Ensure there is at most 2 decimal places
            if decimalValue.as_tuple().exponent >= -2:
                return decimalValue
        except InvalidOperation:
            pass
    
    return None

def toEnumString(value, validValues):
    if value is not None:
        normalizedValue = str(value).upper()
        if normalizedValue in validValues:
            return normalizedValue
    return None

def toEnumList(listValue, validEnumValues):
    if listValue is None or len(listValue) == 0:
        return [], []
    else:
        validValues = []
        invalidValues = []
        for value in listValue:
            normalized = toEnumString(value, validEnumValues)
            if normalized is not None:
                validValues.append(normalized)
            else:
                invalidValues.append(value)
        return validValues, invalidValues

COFFEE_TYPES = ['REGULAR', 'DECAF']
def toCoffeeType(coffeeType):
    return toEnumString(coffeeType, COFFEE_TYPES)

def toCoffeeTypeList(coffeeTypes):
    return toEnumList(coffeeTypes, COFFEE_TYPES)
            

MILK_TYPES = ['REGULAR', 'SKIM', 'OAT', 'ALMOND']
def toMilkType(milkType):
    return toEnumString(milkType, MILK_TYPES)

def toMilkTypeList(milkTypes):
    return toEnumList(milkTypes, MILK_TYPES)