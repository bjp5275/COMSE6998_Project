import json
import traceback

import boto3
from project_utility import (
    send_order_status_update_message,
    update_order_status,
)

# Clients
dynamo = boto3.client("dynamodb")
sqs = boto3.client("sqs")


def process_message(record):
    message_id = record["messageId"]
    message_body = json.loads(record["body"])

    print(f"Processing message {message_id}...")

    customer_id = message_body["customerId"]
    order_id = message_body["orderId"]
    old_status = message_body["previousStatus"]
    new_status = message_body["newStatus"]
    field_updates = message_body["fieldUpdates"]
    if update_order_status(dynamo, order_id, old_status, new_status, field_updates) is None:
        raise ValueError("Failed to update order status")
    send_order_status_update_message(customer_id, order_id, new_status)

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
                    print(f"Error processing record {record['messageId']}", repr(e))
                    batch_item_failures.append({"itemIdentifier": record["messageId"]})

            response["batchItemFailures"] = batch_item_failures
    except Exception as e:
        error_string = traceback.format_exc()
        print(error_string)

    print("Response", response)
    return response
