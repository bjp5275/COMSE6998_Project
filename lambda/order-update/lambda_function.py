import json
import traceback

import boto3
from project_utility import (
    EnvironmentVariables,
    deserialize_dynamo_object,
    send_sqs_message,
    serialize_to_dynamo_object,
)

# Clients
dynamo = boto3.client("dynamodb")
sqs = boto3.client("sqs")


def update_order(user_id, order_id, field_updates):
    response = dynamo.get_item(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        Key={
            "customerId": {
                "S": user_id,
            },
            "id": {
                "S": order_id,
            },
        },
    )

    order = response["Item"] if "Item" in response else None
    if order is None:
        raise ValueError(f"Couldn't find order {order_id}")

    order = deserialize_dynamo_object(order)

    for key in field_updates:
        order[key] = field_updates[key]

    dynamo.put_item(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        Item=serialize_to_dynamo_object(order),
    )

    print("Order saved")


def send_order_update_confirmation_message(
    customer_id, order_id, old_status, new_status, field_updates
):
    print(
        f"Sending order update confirmation message for customer {customer_id}'s order {order_id} with status {new_status}"
    )

    message = {
        "customerId": customer_id,
        "orderId": order_id,
        "previousStatus": old_status,
        "newStatus": new_status,
        "fieldUpdates": field_updates,
    }
    return send_sqs_message(
        sqs, EnvironmentVariables.ORDER_UPDATE_CONFIRMATION_QUEUE_URL.value, message
    )


def process_message(record):
    message_id = record["messageId"]
    message_body = json.loads(record["body"])

    print(f"Processing message {message_id}...")

    customer_id = message_body["customerId"]
    order_id = message_body["orderId"]
    field_updates = message_body["fieldUpdates"]
    old_status = message_body["previousStatus"]
    new_status = message_body["newStatus"]

    field_updates["orderStatus"] = new_status
    update_order(customer_id, order_id, field_updates)
    send_order_update_confirmation_message(
        customer_id, order_id, old_status, new_status, field_updates
    )

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
