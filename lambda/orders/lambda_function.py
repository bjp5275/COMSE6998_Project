import json
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import boto3
from project_utility import (
    ErrorCodes,
    OrderStatus,
    UserRole,
    build_error_response,
    build_response,
    deserialize_dynamo_object,
    extract_user_id,
    get_additions_by_id,
    get_path_parameter,
    get_products_by_id,
    send_order_status_update_message,
    serialize_to_dynamo_object,
    to_coffee_type,
    to_milk_type,
    user_has_role,
    validate_location,
    validate_payment_information,
)

# Dynamo Tables
PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
ORDERS_TABLE = os.environ["ORDERS_TABLE"]
ORDER_RATINGS_TABLE = os.environ["ORDER_RATINGS_TABLE"]

# Clients
dynamo = boto3.client("dynamodb")

# Constants
PRODUCT_TYPE = "PRODUCT"
ADDITION_TYPE = "ADDITION"
MINIMUM_ORDER_TIME_DELTA_MINUTES = 30
MINIMUM_ORDER_TIME_DELTA = timedelta(minutes=MINIMUM_ORDER_TIME_DELTA_MINUTES)


def _build_items_from_dynamo_response(items):
    cleaned_items = []
    for item in items:
        order = deserialize_dynamo_object(item)
        order.pop("customerId")
        cleaned_items.append(order)
    return cleaned_items


def build_orders_from_dynamo_response(items):
    return _build_items_from_dynamo_response(items)


def build_order_ratings_from_dynamo_response(items):
    return _build_items_from_dynamo_response(items)


def get_orders(event, context):
    customer_id = extract_user_id(event)

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
    orders = build_orders_from_dynamo_response(orders)
    return build_response(200, orders)


def user_owns_order(user_id, order_id):
    print(f"Checking user {user_id} owns order {order_id}")
    order = get_raw_order_for_user(user_id, order_id)
    return order is not None, order


def get_order_ratings(event, context):
    user_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    has_ownership, _ = user_owns_order(user_id, order_id)
    if not has_ownership:
        return build_error_response(
            ErrorCodes.NOT_AUTHORIZED, "You must own the order to see ratings"
        )

    print(f"Getting all order ratings for order {order_id}")
    response = dynamo.query(
        TableName=ORDER_RATINGS_TABLE,
        KeyConditionExpression="orderId = :orderId",
        ExpressionAttributeValues={
            ":orderId": {
                "S": order_id,
            },
        },
    )
    ratings = response["Items"]

    print(f"Found {len(ratings)} order ratings")
    ratings = build_order_ratings_from_dynamo_response(ratings)
    return build_response(200, ratings)


def submit_order_rating(event, context):
    user_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    has_ownership, raw_order = user_owns_order(user_id, order_id)
    if not has_ownership:
        return build_error_response(
            ErrorCodes.NOT_AUTHORIZED, "You must own the order to submit ratings"
        )

    input_rating = json.loads(event["body"])
    validated_rating = {"customerId": user_id}

    if "orderId" not in input_rating or input_rating["orderId"] != order_id:
        return build_error_response(
            ErrorCodes.INVALID_DATA, "Invalid orderId value in rating"
        )
    validated_rating["orderId"] = order_id

    order_item_ids = [item["id"] for item in raw_order["items"]]
    if (
        "orderItemId" not in input_rating
        or str(input_rating["orderItemId"]) not in order_item_ids
    ):
        return build_error_response(
            ErrorCodes.INVALID_DATA, "Invalid orderItemId value in rating"
        )
    validated_rating["orderItemId"] = str(input_rating["orderItemId"])

    if "rating" not in input_rating:
        return build_error_response(
            ErrorCodes.INVALID_DATA, "You must specify a rating value"
        )
    else:
        try:
            rating_value = int(input_rating["rating"])
            if rating_value < 1 or rating_value > 5:
                return build_error_response(
                    ErrorCodes.INVALID_DATA, "Rating must be an integer between 1 and 5"
                )

            validated_rating["orderItemId"] = str(input_rating["orderItemId"])
        except:
            return build_error_response(ErrorCodes.INVALID_DATA, "Invalid rating value")

    print("Validated. Saving to Dynamo...", validated_rating)

    dynamo.put_item(
        TableName=ORDER_RATINGS_TABLE, Item=serialize_to_dynamo_object(validated_rating)
    )

    print("Order rating saved")
    return build_response(200, None)


def get_raw_order_for_user(user_id, order_id):
    print(f"Getting order {order_id} for customer {user_id}")
    response = dynamo.get_item(
        TableName=ORDERS_TABLE,
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
    return order


def get_single_order(event, context):
    customer_id = extract_user_id(event)

    order_id = get_path_parameter(event, "id", None)
    if order_id is None:
        return build_error_response(ErrorCodes.MISSING_DATA, "Must specify an order ID")

    raw_order = get_raw_order_for_user(customer_id, order_id)
    if raw_order is None:
        return build_error_response(ErrorCodes.NOT_FOUND, f"Order {order_id} not found")

    order = build_orders_from_dynamo_response([raw_order])[0]
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
    validated_order = {
        "customerId": customer_id,
        "id": id,
        "orderStatus": OrderStatus.RECEIVED.value,
    }

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
            return False, None, "Invalid delivery time"
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
    customer_id = extract_user_id(event)

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
        if not user_has_role(extract_user_id(event), UserRole.REGULAR_USER):
            response = build_error_response(
                ErrorCodes.NOT_AUTHORIZED, "You must sign up to be a customer!"
            )
        else:
            httpMethod = event["httpMethod"]
            resource = event["resource"]
            response = build_error_response(
                ErrorCodes.UNKNOWN_ERROR,
                f"Unknown resource: {httpMethod} {resource}",
            )

            if httpMethod == "GET":
                if resource == "/orders":
                    response = get_orders(event, context)
                elif resource == "/orders/{id}/ratings":
                    response = get_order_ratings(event, context)
                elif resource == "/orders/{id}/ratings":
                    response = get_single_order(event, context)
            elif httpMethod == "POST" and resource == "/orders":
                response = submit_order(event, context)
            elif httpMethod == "PUT" and resource == "/orders/{id}/ratings":
                response = submit_order_rating(event, context)
    except Exception as e:
        print("Error", e)
        response = build_error_response(ErrorCodes.UNKNOWN_ERROR, "Internal Exception")

    print("Response", response)
    return response
