import json
import os
import uuid
from decimal import Decimal

import boto3
from project_utility import (
    ErrorCodes,
    UserRole,
    build_error_response,
    build_response,
    deserialize_dynamo_object,
    extract_user_id,
    get_query_parameter,
    is_valid_user,
    serialize_to_dynamo_object,
    user_has_role,
    validate_price,
)

# Dynamo Tables
PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]

# Clients
dynamo = boto3.client("dynamodb")

# Constants
INCLUDE_DISABLED_FLAG = "includeDisabled"
PRODUCT_TYPE = "PRODUCT"
ADDITION_TYPE = "ADDITION"


def build_object_from_dynamo_response(items):
    objects = []
    for item in items:
        obj = deserialize_dynamo_object(item)
        obj.pop("_type")
        objects.append(obj)
    return objects


def get_additions(event, context):
    # Base filter expression and values
    filterExpression = "#TYPE = :type"
    filterExpressionValues = {
        ":type": {
            "S": ADDITION_TYPE,
        },
    }
    expressionNames = {"#TYPE": "_type"}

    # Check include_disabled flag
    include_disabled = (
        get_query_parameter(event, INCLUDE_DISABLED_FLAG, "false").lower() == "true"
    )

    # Filter out disabled items
    if not include_disabled:
        filterExpression = f"({filterExpression}) AND enabled = :enabled"
        filterExpressionValues[":enabled"] = {
            "BOOL": True,
        }

    print(
        f"Getting all additions ({'including' if include_disabled else 'excluding'} disabled additions)"
    )
    response = dynamo.scan(
        TableName=PRODUCTS_TABLE,
        FilterExpression=filterExpression,
        ExpressionAttributeNames=expressionNames,
        ExpressionAttributeValues=filterExpressionValues,
    )
    additions = response["Items"]

    print(f"Found {len(additions)} additions")
    additions = build_object_from_dynamo_response(additions)
    return build_response(200, additions)


def create_addition(addition):
    validated_addition = {"_type": ADDITION_TYPE}

    if "id" in addition and len(str(addition["id"])) > 0:
        id = str(addition["id"])
        print(f"Updating addition {id}")
    else:
        id = str(uuid.uuid4())
        print(f"Creating addition {id}", addition)
    validated_addition["id"] = id

    print("Validating addition...")

    if "enabled" in addition:
        validated_addition["enabled"] = str(addition["enabled"]).lower() == "true"
    else:
        validated_addition["enabled"] = True

    if "name" in addition:
        validated_addition["name"] = str(addition["name"])
    else:
        return False, None, "Addition must have a name"

    if "price" in addition:
        price = validate_price(addition["price"])
        if price is None:
            return False, None, "Invalid price"
        elif price <= 0:
            return False, None, "Price must be non-negative"
        validated_addition["price"] = price
    else:
        return False, None, "Addition must have a price"

    print("Validated. Saving to Dynamo...", validated_addition)

    dynamo.put_item(
        TableName=PRODUCTS_TABLE, Item=serialize_to_dynamo_object(validated_addition)
    )

    print("Addition saved")
    validated_addition.pop("_type")
    return True, validated_addition, id


def upsert_addition(event, context):
    if "body" not in event or event["body"] is None:
        return build_error_response(
            ErrorCodes.MISSING_BODY, "Must specify a request body"
        )

    input_addition = json.loads(event["body"], parse_float=Decimal)
    success, addition, data = create_addition(input_addition)

    if success:
        return build_response(200, addition)
    else:
        return build_error_response(ErrorCodes.INVALID_DATA, data)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        httpMethod = event["httpMethod"]
        if httpMethod == "GET":
            if is_valid_user(extract_user_id(event)):
                response = get_additions(event, context)
            else:
                response = build_error_response(
                    ErrorCodes.NOT_AUTHORIZED, "You must sign up to use this service!"
                )
        elif httpMethod == "POST":
            if user_has_role(extract_user_id(event), UserRole.ADMIN):
                response = upsert_addition(event, context)
            else:
                response = build_error_response(
                    ErrorCodes.NOT_AUTHORIZED, "You are not an admin!"
                )
        else:
            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR, f"Unknown method: {httpMethod}"
            )
    except Exception as e:
        print("Error", e)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
