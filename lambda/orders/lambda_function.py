import json
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import boto3
from project_utility import (
    ErrorCodes,
    build_error_response,
    build_response,
    deserialize_dynamo_object,
    extract_customer_id,
    get_additions_by_id,
    get_path_parameter,
    get_products_by_id,
    send_order_status_update_message,
    serialize_to_dynamo_object,
    to_coffee_type,
    to_milk_type,
    validate_location,
    validate_payment_information,
)

# Dynamo Tables
PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
ORDERS_TABLE = os.environ["ORDERS_TABLE"]

# Clients
dynamo = boto3.client("dynamodb")

# Constants
PRODUCT_TYPE = "PRODUCT"
ADDITION_TYPE = "ADDITION"
MINIMUM_ORDER_TIME_DELTA_MINUTES = 30
MINIMUM_ORDER_TIME_DELTA = timedelta(minutes=MINIMUM_ORDER_TIME_DELTA_MINUTES)


def build_order_from_dynamo_response(items):
    orders = []
    for item in items:
        order = deserialize_dynamo_object(item)
        order.pop("customerId")
        orders.append(order)
    return orders


def get_orders(event, context):
    customer_id = extract_customer_id(event)

    print(f"Getting all orders for customer {customer_id}")
    response = dynamo.query(
        TableName=ORDERS_TABLE,
        KeyConditionExpression="customerId = :customerId",
        ExpressionAttributeValues={
            ":customerId": {
                "S": customer_id,
            },
        },
    )
    orders = response["Items"]

    print(f"Found {len(orders)} orders")
    orders = build_order_from_dynamo_response(orders)
    return build_response(200, orders)


def get_single_order(event, context):
    customer_id = extract_customer_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    print(f"Getting order {order_id} for customer {customer_id}")
    response = dynamo.get_item(
        TableName=ORDERS_TABLE,
        Key={
            "customerId": {
                "S": customer_id,
            },
            "id": {
                "S": order_id,
            },
        },
    )
    order = response["Item"] if "Item" in response else None
    if order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")

    order = build_order_from_dynamo_response([order])[0]
    return build_response(200, order)


def collect_used_products_and_additions(items):
    product_ids = []
    addition_ids = []

    for item in items:
        if item is not None:
            if "productId" in item and item["productId"] is not None:
                product_ids.append(item["productId"])

            if "additions" in item and item["additions"] is not None:
                for addition in item["additions"]:
                    if "id" in addition and addition["id"] is not None:
                        addition_ids.append(addition["id"])

    products = get_products_by_id(dynamo, product_ids)
    additions = get_additions_by_id(dynamo, addition_ids)
    return products, additions


def validate_order_item(item, index, known_products, known_additions):
    id = str(uuid.uuid4())
    validated_order_item = {
        "id": id,
    }

    if "productId" in item:
        product_id = str(item["productId"])
        if product_id not in known_products:
            return False, f"Unknown product {product_id} for order item {index+1}"

        validated_product = known_products[product_id]
        validated_order_item["productId"] = product_id
    else:
        return False, f"Order item {index+1} missing product ID"

    validated_order_item["basePrice"] = validated_product["basePrice"]

    if "coffeeType" in item:
        coffee_type = to_coffee_type(item["coffeeType"])
        if (
            coffee_type is None
            or coffee_type not in validated_product["allowedCoffeeTypes"]
        ):
            return (
                False,
                f"Order item {index+1} has invalid coffee type ({coffee_type}). Valid value(s): {', '.join(validated_product['allowedCoffeeTypes'])}",
            )

        validated_order_item["coffeeType"] = coffee_type
    else:
        return False, f"Order item {index+1} must have coffee type specified"

    if "milkType" in item:
        if "allowedMilkTypes" not in validated_product:
            return (
                False,
                f"Order item {index+1} specified a milk type but product doest not support milk types",
            )

        milk_type = to_milk_type(item["milkType"])
        if milk_type is None or milk_type not in validated_product["allowedMilkTypes"]:
            return (
                False,
                f"Order item {index+1} has invalid milk type ({milk_type}). Valid value(s): {', '.join(validated_product['allowedMilkTypes'])}",
            )

        validated_order_item["milkType"] = milk_type
    elif validated_product["allowedMilkTypes"] is not None:
        return (
            False,
            f"Order item {index+1} must specify a milk type. Valid value(s): {', '.join(validated_product['allowedMilkTypes'])}",
        )

    if "additions" in item:
        validated_additions = []
        allowed_addition_ids = (
            validated_product["allowedAdditions"]
            if "allowedAdditions" in validated_product
            else []
        )

        for addition in item["additions"]:
            if "id" not in addition:
                return False, f"Order item {index+1} must specify addition IDs"
            elif addition["id"] not in known_additions:
                return (
                    False,
                    f"Order item {index+1} uses unknown addition {addition['id']}",
                )
            elif addition["id"] not in allowed_addition_ids:
                return (
                    False,
                    f"Order item {index+1} uses {addition['id']} which is not allowed on that product",
                )

            valid_addition = known_additions[addition["id"]]
            if not valid_addition["enabled"]:
                return (
                    False,
                    f"Order item {index+1} uses disabled addition {addition['id']}",
                )
            else:
                validated_additions.append(valid_addition)
        validated_order_item["additions"] = validated_additions

    return True, validated_order_item


def create_order(customer_id, order):
    id = str(uuid.uuid4())
    validated_order = {"customerId": customer_id, "id": id, "orderStatus": "RECEIVED"}

    print("Validating order...")

    if "deliveryTime" in order:
        delivery_time = order["deliveryTime"]
        try:
            delivery_time = datetime.strptime(delivery_time, "%Y-%m-%dT%H:%M:%S.%fZ")
            if delivery_time < datetime.now() + MINIMUM_ORDER_TIME_DELTA:
                return (
                    False,
                    None,
                    f"Order delivery time must be at least {MINIMUM_ORDER_TIME_DELTA_MINUTES} minutes in the future",
                )

            validated_order["deliveryTime"] = f"{delivery_time.isoformat()}Z"
        except:
            print("Error")
    else:
        return False, None, "Order must have a delivery time"

    if "deliveryLocation" in order:
        is_valid, data = validate_location(
            order["deliveryLocation"], "Delivery location"
        )
        if is_valid:
            validated_order["deliveryLocation"] = data
        else:
            return False, None, data
    else:
        return False, None, "Order must have a delivery location"

    if "payment" in order:
        is_valid, data = validate_payment_information(
            order["payment"], "Payment information"
        )
        if is_valid:
            validated_order["payment"] = data
        else:
            return False, None, data
    else:
        return False, None, "Order must have payment information"

    if "items" not in order or len(order["items"]) == 0:
        return False, None, "Order must have items"

    items = order["items"]
    products, additions = collect_used_products_and_additions(items)

    validated_items = []
    for index, item in enumerate(items):
        is_valid, data = validate_order_item(item, index, products, additions)
        if is_valid:
            validated_items.append(data)
        else:
            return False, None, f"Order item {index+1} invalid: {str(item)}"
    validated_order["items"] = validated_items

    print("Validated. Saving to Dynamo...", validated_order)

    dynamo.put_item(
        TableName=ORDERS_TABLE, Item=serialize_to_dynamo_object(validated_order)
    )

    print("Order saved")
    validated_order.pop("customerId")
    return True, validated_order, id


def submit_order(event, context):
    customer_id = extract_customer_id(event)

    if "body" not in event or event["body"] is None:
        return build_error_response(
            ErrorCodes.MISSING_BODY, "Must specify a request body"
        )

    input_order = json.loads(event["body"], parse_float=Decimal)
    success, order, data = create_order(customer_id, input_order)

    if success:
        send_order_status_update_message(
            boto3.client("sqs"), customer_id, order["id"], order["orderStatus"]
        )
        return build_response(200, order)
    else:
        return build_error_response(ErrorCodes.INVALID_DATA, data)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    try:
        httpMethod = event["httpMethod"]
        resource = event["resource"]
        if httpMethod == "GET":
            if resource == "/orders":
                response = get_orders(event, context)
            else:
                response = get_single_order(event, context)
        elif httpMethod == "POST":
            response = submit_order(event, context)
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
