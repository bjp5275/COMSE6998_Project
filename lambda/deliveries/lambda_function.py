import os
import traceback

import boto3
from project_utility import (
    DELIVERY_FEE_RATE,
    MIN_DELIVERY_FEE,
    EnvironmentVariables,
    ErrorCodes,
    OrderStatus,
    UserRole,
    build_error_response,
    build_response,
    calculate_order_total_percentage,
    deserialize_dynamo_object,
    extract_user_id,
    get_path_parameter,
    get_query_parameter,
    send_order_status_update_message,
    serialize_to_dynamo_object,
    user_has_role,
)

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
    deliverer_id = extract_user_id(event)

    print(f"Looking up orders for deliverer {deliverer_id}")
    response = dynamo.scan(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
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
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
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
    deliverer_id = extract_user_id(event)

    print(f"Looking up available orders for deliverer {deliverer_id}")
    response = dynamo.scan(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        FilterExpression="attribute_not_exists(delivererId) AND orderStatus = :orderStatus",
        ExpressionAttributeValues={
            ":orderStatus": {
                "S": OrderStatus.MADE.value,
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
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
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
    deliverer_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    order = get_order_for_deliverer(deliverer_id, order_id)
    if order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")
    else:
        return build_response(200, order)


def secure_order(event, context):
    deliverer_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    print(f"Attempting to secure order {order_id} for deliverer {deliverer_id}")
    order = get_raw_order(order_id)
    if order is None or "delivererId" in order:
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is already taken")
    elif order["orderStatus"] != OrderStatus.MADE.value:
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is not available")

    order["delivererId"] = deliverer_id
    order["deliveryFee"] = calculate_delivery_fee(order)
    dynamo.put_item(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        Item=serialize_to_dynamo_object(order),
    )

    print("Order secured")
    send_order_status_update_message(
        order["customerId"], order["id"], order["orderStatus"]
    )
    return build_response(200, None)


def update_order_status(event, context):
    deliverer_id = extract_user_id(event)

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

    new_status = get_query_parameter(event, "newStatus", OrderStatus.PICKED_UP.value)
    if (
        order["orderStatus"] == OrderStatus.MADE.value
        and new_status != OrderStatus.PICKED_UP.value
    ) or (
        order["orderStatus"] == OrderStatus.PICKED_UP.value
        and new_status != OrderStatus.DELIVERED.value
    ):
        return build_error_response(
            ErrorCodes.INVALID_DATA, f"Invalid new status: {new_status}"
        )

    order["orderStatus"] = new_status
    dynamo.put_item(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        Item=serialize_to_dynamo_object(order),
    )

    print("Order Updated")
    send_order_status_update_message(
        order["customerId"], order["id"], order["orderStatus"]
    )
    return build_response(200, None)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        if not user_has_role(extract_user_id(event), UserRole.DELIVERER):
            response = build_error_response(
                ErrorCodes.NOT_AUTHORIZED, "You are not a deliverer!"
            )
        else:
            httpMethod = event["httpMethod"]
            resource = event["resource"]

            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Unknown resource: {httpMethod} {resource}",
            )

            if httpMethod == "GET":
                if resource == "/deliveries":
                    response = get_previous_orders(event, context)
                elif resource == "/deliveries/available":
                    response = get_available_orders(event, context)
                elif resource == "/deliveries/{id}":
                    response = get_single_order(event, context)
            elif httpMethod == "POST":
                if resource == "/deliveries/{id}/secure":
                    response = secure_order(event, context)
                elif resource == "/deliveries/{id}/status":
                    response = update_order_status(event, context)
    except Exception as e:
        error_string = traceback.format_exc()
        print(error_string)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
