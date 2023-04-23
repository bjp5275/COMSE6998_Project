import os

import boto3
from project_utility import (
    ErrorCodes,
    build_error_response,
    build_response,
    deserialize_dynamo_object,
    extract_shop_id,
    get_path_parameter,
    get_query_parameter,
    serialize_to_dynamo_object,
)

# Dynamo Tables
PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
ORDERS_TABLE = os.environ["ORDERS_TABLE"]

# Clients
dynamo = boto3.client("dynamodb")

# Constants
TRANFER_FIELDS = [
    "id",
    "orderStatus",
    "deliveryTime",
    "deliveryLocation",
    "commission",
    "items",
]


def transfer_field(raw_order, destination_order, field, required=False):
    if field in raw_order:
        destination_order[field] = raw_order[field]
    elif required:
        raise ValueError(f"Required field {field} not found on order")


def build_pending_orders_from_dynamo_response(items):
    orders = []
    for item in items:
        order = deserialize_dynamo_object(item)
        cleaned_order = {}
        for field in TRANFER_FIELDS:
            transfer_field(order, cleaned_order, field)

        orders.append(cleaned_order)
    return orders


def get_previous_orders(event, context):
    shop_id = extract_shop_id(event)

    print(f"Looking up orders for shop {shop_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="shopId = :shopId",
        ExpressionAttributeValues={
            ":shopId": {
                "S": shop_id,
            },
        },
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_pending_orders_from_dynamo_response(orders)
    return build_response(200, orders)


def get_raw_order(order_id):
    print(f"Looking up {order_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="orderId = :orderId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
        },
    )

    orders = response["Item"] if "Item" in response else None
    if orders is None or len(orders) != 1:
        return None

    return deserialize_dynamo_object(orders[0])


def get_available_orders(event, context):
    shop_id = extract_shop_id(event)

    print(f"Looking up available orders for shop {shop_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="attribute_not_exists(shopId)",
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_pending_orders_from_dynamo_response(orders)
    return build_response(200, orders)


def get_order_for_shop(shop_id, order_id):
    print(f"Getting order {order_id} for shop {shop_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="orderId = :orderId AND shopId = :shopId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
            ":shopId": {
                "S": shop_id,
            },
        },
    )

    orders = response["Item"] if "Item" in response else None
    if orders is None or len(orders) != 1:
        return None
    else:
        return build_pending_orders_from_dynamo_response(orders)[0]


def get_single_order(event, context):
    shop_id = extract_shop_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    order = get_order_for_shop(shop_id, order_id)
    if order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")
    else:
        return build_response(200, order)


def secure_order(event, context):
    shop_id = extract_shop_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    print(f"Attempting to secure order {order_id} for shop {shop_id}")
    order = get_raw_order(order_id)
    if order is None or "shopId" in order:
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is already taken")

    order["shopId"] = shop_id
    order["orderStatus"] = "BREWING"
    dynamo.put_item(TableName=ORDERS_TABLE, Item=serialize_to_dynamo_object(order))

    print("Order secured")
    return build_response(200, None)


def update_order_status(event, context):
    shop_id = extract_shop_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    new_status = get_query_parameter(event, "newStatus", "MADE")
    if new_status != "MADE":
        return build_error_response(
            ErrorCodes.INVALID_DATA, f"Invalid new status: {new_status}"
        )

    order = get_raw_order(order_id)
    if order is None or "shopId" not in order or order["shopId"] != shop_id:
        return build_error_response(ErrorCodes.NOT_FOUND, "Order not found")

    order["orderStatus"] = new_status
    dynamo.put_item(TableName=ORDERS_TABLE, Item=serialize_to_dynamo_object(order))

    print("Order Updated")
    return build_response(200, None)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        httpMethod = event["httpMethod"]
        resource = event["resource"]
        if httpMethod == "GET":
            if resource == "/pending-orders":
                response = get_previous_orders(event, context)
            elif resource == "/pending-orders/available":
                response = get_available_orders(event, context)
            else:
                response = get_single_order(event, context)
        elif httpMethod == "POST":
            if resource == "/pending-orders/{id}/secure":
                response = secure_order(event, context)
            else:
                response = update_order_status(event, context)
        else:
            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Unknown resource: {httpMethod} {resource}",
            )
    except Exception as e:
        print("Error", e)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
