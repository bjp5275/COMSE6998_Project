import os

import boto3
from project_utility import (
    DELIVERY_FEE_RATE,
    MIN_DELIVERY_FEE,
    ErrorCodes,
    build_error_response,
    build_response,
    calculate_order_total_percentage,
    deserialize_dynamo_object,
    extract_deliverer_id,
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
    "preparedLocation",
    "deliveryLocation",
    "deliveryFee",
    "items",
]


def calculate_delivery_fee(order):
    return calculate_order_total_percentage(order, DELIVERY_FEE_RATE, MIN_DELIVERY_FEE)


def transfer_field(raw_order, destination_order, field, required=False):
    if field in raw_order:
        destination_order[field] = raw_order[field]
    elif required:
        raise ValueError(f"Required field {field} not found on order")


def build_delivery_orders_from_dynamo_response(items):
    orders = []
    for item in items:
        order = deserialize_dynamo_object(item)
        cleaned_order = {}
        for field in TRANFER_FIELDS:
            transfer_field(order, cleaned_order, field)

        orders.append(cleaned_order)
    return orders


def get_previous_orders(event, context):
    deliverer_id = extract_deliverer_id(event)

    print(f"Looking up orders for deliverer {deliverer_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="delivererId = :delivererId",
        ExpressionAttributeValues={
            ":delivererId": {
                "S": deliverer_id,
            },
        },
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_delivery_orders_from_dynamo_response(orders)
    return build_response(200, orders)


def get_raw_order(order_id):
    print(f"Looking up {order_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="id = :orderId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
        },
    )

    orders = response["Items"] if "Items" in response else None
    if orders is None or len(orders) != 1:
        return None

    return deserialize_dynamo_object(orders[0])


def get_available_orders(event, context):
    deliverer_id = extract_deliverer_id(event)

    print(f"Looking up available orders for deliverer {deliverer_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="attribute_not_exists(delivererId) AND orderStatus = :orderStatus",
        ExpressionAttributeValues={
            ":orderStatus": {
                "S": "MADE",
            },
        },
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_delivery_orders_from_dynamo_response(orders)

    for order in orders:
        order["deliveryFee"] = calculate_delivery_fee(order)

    return build_response(200, orders)


def get_order_for_deliverer(deliverer_id, order_id):
    print(f"Getting order {order_id} for deliverer {deliverer_id}")
    response = dynamo.scan(
        TableName=ORDERS_TABLE,
        FilterExpression="id = :orderId AND delivererId = :delivererId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
            ":delivererId": {
                "S": deliverer_id,
            },
        },
    )

    orders = response["Items"] if "Items" in response else None
    if orders is None or len(orders) != 1:
        return None
    else:
        return build_delivery_orders_from_dynamo_response(orders)[0]


def get_single_order(event, context):
    deliverer_id = extract_deliverer_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    order = get_order_for_deliverer(deliverer_id, order_id)
    if order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")
    else:
        return build_response(200, order)


def secure_order(event, context):
    deliverer_id = extract_deliverer_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    print(f"Attempting to secure order {order_id} for deliverer {deliverer_id}")
    order = get_raw_order(order_id)
    if order is None or "delivererId" in order:
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is already taken")
    elif order['orderStatus'] != "MADE":
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is not available")

    order["delivererId"] = deliverer_id
    order["deliveryFee"] = calculate_delivery_fee(order)
    dynamo.put_item(TableName=ORDERS_TABLE, Item=serialize_to_dynamo_object(order))

    print("Order secured")
    return build_response(200, None)


def update_order_status(event, context):
    deliverer_id = extract_deliverer_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    order = get_raw_order(order_id)
    if (
        order is None
        or "delivererId" not in order
        or order["delivererId"] != deliverer_id
    ):
        return build_error_response(ErrorCodes.NOT_FOUND, "Order not found")

    new_status = get_query_parameter(event, "newStatus", "PICKED_UP")
    if (order["orderStatus"] == "MADE" and new_status != "PICKED_UP") or (
        order["orderStatus"] == "PICKED_UP" and new_status != "DELIVERED"
    ):
        return build_error_response(
            ErrorCodes.INVALID_DATA, f"Invalid new status: {new_status}"
        )

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
            if resource == "/deliveries":
                response = get_previous_orders(event, context)
            elif resource == "/deliveries/available":
                response = get_available_orders(event, context)
            else:
                response = get_single_order(event, context)
        elif httpMethod == "POST":
            if resource == "/deliveries/{id}/secure":
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
