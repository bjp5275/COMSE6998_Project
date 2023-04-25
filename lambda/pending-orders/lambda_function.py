import os
import traceback

import boto3
from project_utility import (
    COMMISSION_RATE,
    MIN_COMMISSION,
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
    get_shop_by_id,
    is_shop_set_up,
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
    "deliveryLocation",
    "commission",
    "items",
]


def calculate_commission(order):
    return calculate_order_total_percentage(order, COMMISSION_RATE, MIN_COMMISSION)


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
    shop_id = extract_user_id(event)

    print(f"Looking up orders for shop {shop_id}")
    response = dynamo.scan(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
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
    shop_id = extract_user_id(event)

    print(f"Looking up available orders for shop {shop_id}")
    response = dynamo.scan(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        FilterExpression="attribute_not_exists(shopId)",
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_pending_orders_from_dynamo_response(orders)

    for order in orders:
        order["commission"] = calculate_commission(order)

    return build_response(200, orders)


def get_order_for_shop(shop_id, order_id):
    print(f"Getting order {order_id} for shop {shop_id}")
    response = dynamo.scan(
        TableName=EnvironmentVariables.ORDERS_TABLE.value,
        FilterExpression="id = :orderId AND shopId = :shopId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
            ":shopId": {
                "S": shop_id,
            },
        },
    )

    orders = response["Items"] if "Items" in response else None
    if orders is None or len(orders) != 1:
        return None
    else:
        return build_pending_orders_from_dynamo_response(orders)[0]


def get_single_order(event, context):
    shop_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    order = get_order_for_shop(shop_id, order_id)
    if order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")
    else:
        return build_response(200, order)


def secure_order(event, context):
    shop_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    print(f"Attempting to secure order {order_id} for shop {shop_id}")
    order = get_raw_order(order_id)
    if order is None or "shopId" in order:
        return build_error_response(ErrorCodes.INVALID_DATA, "Order is already taken")

    shop_info = get_shop_by_id(dynamo, shop_id)

    order["shopId"] = shop_id
    order["preparedLocation"] = shop_info["preparedLocation"]
    order["orderStatus"] = OrderStatus.BREWING.value
    order["commission"] = calculate_commission(order)
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
    shop_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    new_status = get_query_parameter(event, "newStatus", OrderStatus.MADE.value)
    if new_status != OrderStatus.MADE.value:
        return build_error_response(
            ErrorCodes.INVALID_DATA, f"Invalid new status: {new_status}"
        )

    order = get_raw_order(order_id)
    if order is None or "shopId" not in order or order["shopId"] != shop_id:
        return build_error_response(ErrorCodes.NOT_FOUND, "Order not found")

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
        user_id = extract_user_id(event)

        if not user_has_role(user_id, UserRole.SHOP_OWNER):
            response = build_error_response(
                ErrorCodes.NOT_AUTHORIZED, "You are not a shop owner!"
            )
        elif not is_shop_set_up(dynamo, user_id):
            response = build_error_response(
                ErrorCodes.MISSING_DATA, "Your shop is not set up yet!"
            )
        else:
            httpMethod = event["httpMethod"]
            resource = event["resource"]
            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Unknown resource: {httpMethod} {resource}",
            )

            if httpMethod == "GET":
                if resource == "/pending-orders":
                    response = get_previous_orders(event, context)
                elif resource == "/pending-orders/available":
                    response = get_available_orders(event, context)
                elif resource == "/pending-orders/{id}":
                    response = get_single_order(event, context)
            elif httpMethod == "POST":
                if resource == "/pending-orders/{id}/secure":
                    response = secure_order(event, context)
                elif resource == "/pending-orders/{id}/status":
                    response = update_order_status(event, context)
    except Exception as e:
        error_string = traceback.format_exc()
        print(error_string)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
