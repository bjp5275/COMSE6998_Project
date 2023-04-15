import json
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

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
        formatted_body = json.dumps(body)
    
    return {
        'statusCode': code,
        'body': formatted_body,
        'headers': {
            "Access-Control-Allow-Origin": "*"
        }
    }

def toEnumString(value, validValues):
    if value is not None:
        normalizedValue = str(value).upper()
        if normalizedValue in validValues:
            return normalizedValue
    return None

def toEnumList(listValue, validValues):
    if listValue is None or len(listValue) == 0:
        return [], []
    else:
        validValues = []
        invalidValues = []
        for value in listValue:
            normalized = toEnumString(value, validValues)
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