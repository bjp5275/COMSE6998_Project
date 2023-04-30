import json
import traceback

import boto3
from project_utility import (
    UserNotificationTypes,
    createUiUrl,
    get_user_info,
    send_email,
)

# Clients
ses = boto3.client("ses")
api_gateway = boto3.client("apigateway")


def email_user_new_status(user_id, order_id, new_status):
    user_info = get_user_info(user_id, api_gateway)
    if not user_info:
        raise ValueError(f"Cannot find user {user_id}")

    email = user_info["email"]
    pretty_status = " ".join(map(lambda s: s.capitalize(), new_status.split("_")))
    ui_url = createUiUrl(f"order?id={order_id}")

    message = f'Hi, order {order_id} has a new status: {pretty_status}! For more details, <a href="{ui_url}">view order details</a>.'

    print(f"Sending message to {email}...", message)
    send_email(ses, email, f"Order {order_id} Update", message)


def process_message(record):
    message_id = record["messageId"]
    message_body = json.loads(record["body"])

    print(f"Processing message {message_id}...")

    message_type = message_body["type"] if "type" in message_body else None
    if message_type == UserNotificationTypes.ORDER_STATUS_UPDATE.type_code:
        customer_id = message_body["customerId"]
        order_id = message_body["orderId"]
        new_status = message_body["orderStatus"]
        email_user_new_status(customer_id, order_id, new_status)
    else:
        print(f"Unknown message type: {message_type}")
        raise ValueError("Unknown message type")

    print(f"Processed message {message_id}")


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    batch_item_failures = []
    response = {}

    try:
        if event:
            for record in event["Records"]:
                try:
                    process_message(record)
                except Exception as e:
                    error_string = traceback.format_exc()
                    print(error_string)
                    
                    print(f"Error processing record {record['messageId']}", repr(e))
                    batch_item_failures.append({"itemIdentifier": record["messageId"]})

            response["batchItemFailures"] = batch_item_failures
    except Exception as e:
        error_string = traceback.format_exc()
        print(error_string)

    print("Response", response)
    return response
