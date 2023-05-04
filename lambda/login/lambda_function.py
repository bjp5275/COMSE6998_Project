import json
import traceback
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from project_utility import (
    EnvironmentVariables,
    ErrorCodes,
    UserRole,
    build_error_response,
    build_response,
    extract_user_id,
    get_user_info,
    get_user_saved_data,
    serialize_to_dynamo_object,
    user_has_role,
    validate_location,
    validate_payment_information,
)

# Clients
api_gateway = boto3.client("apigateway")
dynamo = boto3.client("dynamodb")


def get_validated_user_info(event, context):
    if "body" not in event or event["body"] is None:
        return build_error_response(
            ErrorCodes.MISSING_BODY, "Must specify a request body"
        )

    body = json.loads(event["body"])
    if "username" not in body:
        return build_error_response(ErrorCodes.INVALID_DATA, "Must specify username")

    username = body["username"]
    user_id = extract_user_id(event)

    validated_user_info = get_user_info(user_id, api_gateway)

    if not validated_user_info or validated_user_info["username"] != username:
        return build_error_response(ErrorCodes.INVALID_DATA, "Invalid user information")

    user_saved_data = get_user_saved_data(dynamo, user_id)
    if user_saved_data is not None:
        for key in user_saved_data:
            validated_user_info[key] = user_saved_data[key]

    return build_response(200, validated_user_info)


def validate_favorite_order_item(item, name):
    # TODO - Should validate item validity
    return True, item


def validate_favorite_order(favorite, name):
    validated_favorite = {"id": str(uuid.uuid4())}

    if "id" in favorite:
        # TODO - Should match up old and new favorites
        validated_favorite["id"] = str(favorite["id"])

    if "name" in favorite:
        validated_favorite["name"] = str(favorite["name"])
    else:
        return False, f"{name} must have a name"

    if "items" in favorite:
        validated_favorite_items = []
        for index, item in enumerate(favorite["items"]):
            is_valid, data = validate_favorite_order_item(
                item, f"{name} Item {index + 1}"
            )
            if is_valid:
                validated_favorite_items.append(data)
            else:
                return False, None, data

        validated_favorite["items"] = validated_favorite_items
    else:
        return False, f"{name} must have items"

    return True, validated_favorite


def validate_user_data(user_id, input_data, existing_data):
    validated_user_data = {
        "id": user_id,
        "_lastUpdated": datetime.now(timezone.utc).isoformat(),
    }

    print("Validating user data...")

    if "locations" in input_data:
        valid_locations = []
        for index, location in enumerate(input_data["locations"]):
            is_valid, data = validate_location(location, f"Saved Location {index + 1}")
            if is_valid:
                valid_locations.append(data)
            else:
                return False, None, data

        validated_user_data["locations"] = valid_locations
    elif existing_data is not None and "locations" in existing_data:
        validated_user_data["locations"] = existing_data["locations"]

    if "paymentMethods" in input_data:
        valid_payment_methods = []
        for index, payment_method in enumerate(input_data["paymentMethods"]):
            is_valid, data = validate_payment_information(
                payment_method, f"Saved Payment {index + 1}"
            )
            if is_valid:
                valid_payment_methods.append(data)
            else:
                return False, None, data

        validated_user_data["paymentMethods"] = valid_payment_methods
    elif existing_data is not None and "paymentMethods" in existing_data:
        validated_user_data["paymentMethods"] = existing_data["paymentMethods"]

    if "paymentMethods" in input_data:
        valid_payment_methods = []
        for index, payment_method in enumerate(input_data["paymentMethods"]):
            is_valid, data = validate_payment_information(
                payment_method, f"Saved Payment {index + 1}"
            )
            if is_valid:
                valid_payment_methods.append(data)
            else:
                return False, None, data

        validated_user_data["paymentMethods"] = valid_payment_methods
    elif existing_data is not None and "paymentMethods" in existing_data:
        validated_user_data["paymentMethods"] = existing_data["paymentMethods"]

    if "favorites" in input_data:
        valid_favorites = []
        for index, favorite in enumerate(input_data["favorites"]):
            is_valid, data = validate_favorite_order(
                favorite, f"Favorite Order {index + 1}"
            )
            if is_valid:
                valid_favorites.append(data)
            else:
                return False, None, data

        validated_user_data["favorites"] = valid_favorites
    elif existing_data is not None and "favorites" in existing_data:
        validated_user_data["favorites"] = existing_data["favorites"]

    print("Validated", validated_user_data)
    return True, validated_user_data, "Validated"


def update_user_data(event, context):
    user_id = extract_user_id(event)

    if "body" not in event or event["body"] is None:
        return build_error_response(
            ErrorCodes.MISSING_BODY, "Must specify a request body"
        )

    validated_user_info = get_user_info(user_id, api_gateway)
    if not validated_user_info:
        return build_error_response(ErrorCodes.INVALID_DATA, "Invalid user information")

    input_data = json.loads(event["body"], parse_float=Decimal)
    existing_data = get_user_saved_data(dynamo, user_id)
    is_valid, data, message = validate_user_data(user_id, input_data, existing_data)

    if is_valid:
        dynamo.put_item(
            TableName=EnvironmentVariables.USER_INFO_TABLE.value,
            Item=serialize_to_dynamo_object(data),
        )

        print("User data saved")
        for key in data:
            validated_user_info[key] = data[key]
        return build_response(200, data)
    else:
        return build_error_response(ErrorCodes.INVALID_DATA, message)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        httpMethod = event["httpMethod"]
        resource = event["resource"]
        response = build_error_response(
            ErrorCodes.UNKNOWN_ERROR,
            f"Unknown resource: {httpMethod} {resource}",
        )

        if httpMethod == "POST" and resource == "/login":
            response = get_validated_user_info(event, context)
        elif httpMethod == "POST" and resource == "/user":
            if user_has_role(extract_user_id(event), UserRole.REGULAR_USER):
                response = update_user_data(event, context)
            else:
                response = build_error_response(
                    ErrorCodes.NOT_AUTHORIZED, "You must sign up to be a customer!"
                )

    except Exception as e:
        error_string = traceback.format_exc()
        print(error_string)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
