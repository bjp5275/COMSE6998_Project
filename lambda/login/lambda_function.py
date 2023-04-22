import json

import boto3
from project_utility import (
    ErrorCodes,
    build_error_response,
    build_response,
    extract_api_key_id,
    extract_customer_id,
    get_user_info,
)

# Clients
api_gateway = boto3.client("apigateway")


def get_validated_user_info(event, context):
    if "body" not in event or event["body"] is None:
        return build_error_response(
            ErrorCodes.MISSING_BODY, "Must specify a request body"
        )

    body = json.loads(event["body"])
    if "username" not in body:
        return build_error_response(ErrorCodes.INVALID_DATA, "Must specify username")

    username = body["username"]
    api_key_id = extract_api_key_id(event)
    customer_id = extract_customer_id(event)

    validated_user_info = get_user_info(api_gateway, api_key_id, customer_id)

    if not validated_user_info or validated_user_info["username"] != username:
        return build_error_response(ErrorCodes.INVALID_DATA, "Invalid user information")
    else:
        return build_response(200, validated_user_info)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        httpMethod = event["httpMethod"]
        if httpMethod == "POST":
            response = get_validated_user_info(event, context)
        else:
            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR, f"Unknown method: {httpMethod}"
            )
    except Exception as e:
        print("Error", e)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
