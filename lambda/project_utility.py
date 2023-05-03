import json
import os
from decimal import Decimal, InvalidOperation
from enum import Enum

import boto3
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer


# Environment Variables
class EnvironmentVariables(Enum):
    STACK_ID = os.environ["STACK_ID"]
    PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]
    ORDERS_TABLE = os.environ["ORDERS_TABLE"]
    ORDER_STATUS_TABLE = os.environ["ORDER_STATUS_TABLE"]
    ORDER_RATINGS_TABLE = os.environ["ORDER_RATINGS_TABLE"]
    SHOP_INFO_TABLE = os.environ["SHOP_INFO_TABLE"]
    USER_INFO_TABLE = os.environ["USER_INFO_TABLE"]
    USER_NOTIFICATION_QUEUE_URL = os.environ["USER_NOTIFICATION_QUEUE_URL"]
    ORDER_UPDATE_QUEUE_URL = os.environ["ORDER_UPDATE_QUEUE_URL"]
    ORDER_UPDATE_CONFIRMATION_QUEUE_URL = os.environ[
        "ORDER_UPDATE_CONFIRMATION_QUEUE_URL"
    ]
    UI_BASE_URL = os.environ["UI_BASE_URL"]

    def __str__(self):
        return self.name


# Constants
PRODUCT_TYPE = "PRODUCT"
ADDITION_TYPE = "ADDITION"

SES_SOURCE = "bjp2158@columbia.edu"

USER_INFO_EMAIL_TAG = "email"
USER_INFO_USERNAME_TAG = "username"
USER_INFO_DISPLAY_NAME_TAG = "displayName"
USER_INFO_ROLES_TAG = "roles"

COMMISSION_RATE = Decimal("0.20")
MIN_COMMISSION = Decimal("3")
DELIVERY_FEE_RATE = Decimal("0.1")
MIN_DELIVERY_FEE = Decimal("1.5")


# Classes
class ErrorCode:
    def __init__(self, internal_code: int, http_error_code: int):
        self.internal_code = internal_code
        self.http_error_code = http_error_code


class ErrorCodes(ErrorCode, Enum):
    UNKNOWN_ERROR = 0, 500
    MISSING_BODY = 1, 400
    MISSING_DATA = 2, 400
    INVALID_DATA = 3, 400
    NOT_FOUND = 4, 404
    NOT_AUTHORIZED = 5, 401

    def __str__(self):
        return self.name


class UserNotificationType:
    def __init__(self, type_code: str):
        self.type_code = type_code


class UserNotificationTypes(UserNotificationType, Enum):
    ORDER_STATUS_UPDATE = "ORDER_STATUS_UPDATE"

    def __str__(self):
        return self.name


class UserRole(Enum):
    REGULAR_USER = "REGULAR_USER"
    ADMIN = "ADMIN"
    DELIVERER = "DELIVERER"
    SHOP_OWNER = "SHOP_OWNER"

    def __str__(self):
        return self.name


class OrderStatus(Enum):
    RECEIVED = "RECEIVED"
    BREWING = "BREWING"
    MADE = "MADE"
    AWAITING_PICKUP = "AWAITING_PICKUP"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"

    def __str__(self):
        return self.name


def calculate_order_total_percentage(order, rate, minimum):
    order_total = Decimal(0)
    for item in order["items"]:
        order_total += item["basePrice"]
        if "additions" in item:
            for addition in item["additions"]:
                order_total += addition["price"]

    calculated = order_total * rate
    output = max(calculated, minimum)

    return round(output, 2)


def calculate_commission(order):
    return calculate_order_total_percentage(order, COMMISSION_RATE, MIN_COMMISSION)


def calculate_delivery_fee(order):
    return calculate_order_total_percentage(order, DELIVERY_FEE_RATE, MIN_DELIVERY_FEE)


def createUiUrl(path):
    return f"{EnvironmentVariables.UI_BASE_URL.value}/{path}"


def send_sqs_message(sqs, queue_url, message):
    response = sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message))
    return response["MessageId"]


def send_order_status_update_message(customer_id, order_id, new_status, sqs=None):
    if sqs is None:
        sqs = boto3.client("sqs")

    print(
        f"Sending order status update message for customer {customer_id}'s order {order_id} with status {new_status}"
    )
    message = {
        "type": UserNotificationTypes.ORDER_STATUS_UPDATE.type_code,
        "customerId": customer_id,
        "orderId": order_id,
        "orderStatus": new_status,
    }
    return send_sqs_message(
        sqs, EnvironmentVariables.USER_NOTIFICATION_QUEUE_URL.value, message
    )


def send_email(ses, destination_email, subject, message):
    response = ses.send_email(
        Source=SES_SOURCE,
        Destination={"ToAddresses": [destination_email]},
        Message={
            "Subject": {"Data": subject},
            "Body": {
                "Html": {
                    "Data": message,
                }
            },
        },
    )

    print(f"Sent email {response['MessageId']}")


def _extract_api_key_id(event):
    if (
        "requestContext" in event
        and "identity" in event["requestContext"]
        and "apiKeyId" in event["requestContext"]["identity"]
    ):
        return event["requestContext"]["identity"]["apiKeyId"]
    else:
        return None


def extract_user_id(event):
    return _extract_api_key_id(event)


def get_user_info(user_id, api_gateway=None):
    try:
        if api_gateway is None:
            api_gateway = boto3.client("apigateway")

        response = api_gateway.get_api_key(apiKey=user_id, includeValue=False)
        tags = response["tags"]
        email = tags[USER_INFO_EMAIL_TAG]
        username = tags[USER_INFO_USERNAME_TAG]
        display_name = tags[USER_INFO_DISPLAY_NAME_TAG]
        roles = tags[USER_INFO_ROLES_TAG].split(":")
        return {
            "id": user_id,
            "username": username,
            "name": display_name,
            "email": email,
            "roles": roles,
        }
    except:
        return None


def get_user_saved_data(dynamo, user_id):
    print(f"Getting user {user_id}")
    response = dynamo.get_item(
        TableName=EnvironmentVariables.USER_INFO_TABLE.value,
        Key={
            "id": {
                "S": user_id,
            },
        },
    )

    if "Item" in response:
        return deserialize_dynamo_object(response["Item"])
    else:
        return None


def is_valid_user(user_id, api_gateway=None):
    return user_has_role(user_id, None, api_gateway)


def user_has_role(user_id, role: UserRole, api_gateway=None):
    print(f"Validating {user_id} roles...")
    user_info = get_user_info(user_id, api_gateway)
    if user_info is not None:
        print(f"User roles: {user_info['roles']}")
        if role is None or role.value in user_info["roles"]:
            print(f"User has role ({role})")
            return True

    print(f"User does not have role ({role})")
    return False


def decimal_encoder(d):
    if isinstance(d, Decimal):
        return str(d)
    else:
        type_name = d.__class__.__name__
        raise TypeError(f"Object of type {type_name} is not serializable")


def deserialize_dynamo_object(dynamo_obj):
    deserializer = TypeDeserializer()
    return {key: deserializer.deserialize(value) for key, value in dynamo_obj.items()}


def serialize_to_dynamo_object(obj):
    serializer = TypeSerializer()
    return {key: serializer.serialize(value) for key, value in obj.items()}


def _get_event_parameter(event, parameter_type, parameter_name, default_value):
    if parameter_type in event:
        parameters = event[parameter_type]
        if parameters is not None and parameter_name in parameters:
            return parameters[parameter_name]
    return default_value


def get_path_parameter(event, name, default_value):
    return _get_event_parameter(event, "pathParameters", name, default_value)


def get_query_parameter(event, name, default_value):
    return _get_event_parameter(event, "queryStringParameters", name, default_value)


def build_response(code, body):
    formatted_body = body
    if body is not None and type(body) != str:
        formatted_body = json.dumps(body, default=decimal_encoder)

    return {
        "statusCode": code,
        "body": formatted_body,
        "headers": {"Access-Control-Allow-Origin": "*"},
    }


def build_error_response(error_code: ErrorCode, message: str):
    error_response = {"code": error_code.internal_code, "message": message}
    return build_response(error_code.http_error_code, error_response)


def validate_price(value):
    if value is not None:
        try:
            decimalValue = Decimal(value)
            # Ensure there is at most 2 decimal places
            if decimalValue.as_tuple().exponent >= -2:
                return decimalValue
        except InvalidOperation:
            pass

    return None


def validate_location(location, name):
    validated_location = {}

    if "name" in location:
        validated_location["name"] = str(location["name"])

    if "streetAddress" in location:
        validated_location["streetAddress"] = str(location["streetAddress"])
    else:
        return False, f"{name} must have a street address"

    if "city" in location:
        validated_location["city"] = str(location["city"])
    else:
        return False, f"{name} must have a city"

    if "state" in location:
        validated_location["state"] = str(location["state"])
    else:
        return False, f"{name} must have a state"

    if "zip" in location:
        validated_location["zip"] = str(location["zip"])
    else:
        return False, f"{name} must have a zip"

    return True, validated_location


def validate_payment_information(payment_info, name):
    validated_payment_info = {}

    if "nameOnCard" in payment_info:
        validated_payment_info["nameOnCard"] = str(payment_info["nameOnCard"])
    else:
        return False, f"{name} must have the name on the card"

    if "cardNumber" in payment_info:
        validated_payment_info["cardNumber"] = str(payment_info["cardNumber"])
    else:
        return False, f"{name} must have the card number"

    if "cvv" in payment_info:
        validated_payment_info["cvv"] = str(payment_info["cvv"])
    else:
        return False, f"{name} must have the CVV"

    return True, validated_payment_info


def to_enum_string(value, valid_values):
    if value is not None:
        normalized_value = str(value).upper()
        if normalized_value in valid_values:
            return normalized_value
    return None


def to_enum_list(list_value, valid_enum_values):
    if list_value is None or len(list_value) == 0:
        return [], []
    else:
        valid_values = []
        invalid_values = []
        for value in list_value:
            normalized = to_enum_string(value, valid_enum_values)
            if normalized is not None:
                valid_values.append(normalized)
            else:
                invalid_values.append(value)
        return valid_values, invalid_values


COFFEE_TYPES = ["REGULAR", "DECAF"]


def to_coffee_type(coffee_type):
    return to_enum_string(coffee_type, COFFEE_TYPES)


def to_coffee_type_list(coffee_types):
    return to_enum_list(coffee_types, COFFEE_TYPES)


MILK_TYPES = ["REGULAR", "SKIM", "OAT", "ALMOND"]


def to_milk_type(milk_type):
    return to_enum_string(milk_type, MILK_TYPES)


def to_milk_type_list(milk_types):
    return to_enum_list(milk_types, MILK_TYPES)


def get_additions_by_id(dynamo, addition_ids):
    if addition_ids is not None:
        if len(addition_ids) == 0:
            return []

        keys = []
        for id in list(set(addition_ids)):
            keys.append(
                {
                    "id": {
                        "S": id,
                    }
                }
            )

        response = dynamo.batch_get_item(
            RequestItems={
                EnvironmentVariables.PRODUCTS_TABLE.value: {"Keys": keys},
            },
        )
        raw_additions = response["Responses"][EnvironmentVariables.PRODUCTS_TABLE.value]
    else:
        response = dynamo.scan(
            TableName=EnvironmentVariables.PRODUCTS_TABLE.value,
            FilterExpression="#TYPE = :type",
            ExpressionAttributeNames={"#TYPE": "_type"},
            ExpressionAttributeValues={
                ":type": {
                    "S": ADDITION_TYPE,
                },
            },
        )
        raw_additions = response["Items"]

    additions = {}
    raw_additions = filter(lambda a: a["_type"]["S"] == ADDITION_TYPE, raw_additions)
    for raw_addition in raw_additions:
        addition = deserialize_dynamo_object(raw_addition)
        addition.pop("_type")
        additions[addition["id"]] = addition

    return additions


def get_products_by_id(dynamo, product_ids):
    if product_ids is not None:
        if len(product_ids) == 0:
            return []

        keys = []
        for id in list(set(product_ids)):
            keys.append(
                {
                    "id": {
                        "S": id,
                    }
                }
            )

        response = dynamo.batch_get_item(
            RequestItems={
                EnvironmentVariables.PRODUCTS_TABLE.value: {"Keys": keys},
            },
        )
        raw_products = response["Responses"][EnvironmentVariables.PRODUCTS_TABLE.value]
    else:
        response = dynamo.scan(
            TableName=EnvironmentVariables.PRODUCTS_TABLE.value,
            FilterExpression="#TYPE = :type",
            ExpressionAttributeNames={"#TYPE": "_type"},
            ExpressionAttributeValues={
                ":type": {
                    "S": PRODUCT_TYPE,
                },
            },
        )
        raw_products = response["Items"]

    products = {}
    raw_products = filter(lambda p: p["_type"]["S"] == PRODUCT_TYPE, raw_products)
    for raw_product in raw_products:
        product = deserialize_dynamo_object(raw_product)
        product.pop("_type")
        products[product["id"]] = product

    return products


def is_shop_set_up(dynamo, shop_id):
    shop_info = get_shop_by_id(dynamo, shop_id)
    if shop_info is not None and "location" in shop_info:
        return True

    return False


def get_shop_by_id(dynamo, shop_id):
    print(f"Getting shop {shop_id}")
    response = dynamo.get_item(
        TableName=EnvironmentVariables.SHOP_INFO_TABLE.value,
        Key={
            "shopId": {
                "S": shop_id,
            },
        },
    )

    if "Item" in response:
        return deserialize_dynamo_object(response["Item"])
    else:
        return None


def initialize_order_status(dynamo, order_status):
    dynamo.transact_write_items(
        TransactItems=[
            {
                "Put": {
                    "Item": serialize_to_dynamo_object(order_status),
                    "TableName": EnvironmentVariables.ORDER_STATUS_TABLE.value,
                }
            },
        ],
    )


def get_order_status(dynamo, order_id):
    print(f"Getting order {order_id} status...")
    response = dynamo.transact_get_items(
        TransactItems=[
            {
                "Get": {
                    "Key": {
                        "id": {
                            "S": order_id,
                        },
                    },
                    "TableName": EnvironmentVariables.ORDER_STATUS_TABLE.value,
                }
            }
        ]
    )

    if "Responses" in response:
        return deserialize_dynamo_object(response["Responses"][0]["Item"])
    else:
        return None


def update_order_status(dynamo, order_id, previous_status, new_status, field_updates):
    update_expression = "SET orderStatus = :new_status, updating = :new_updating"
    expression_values = {
        ":old_status": {
            "S": previous_status,
        },
        ":new_status": {
            "S": new_status,
        },
        ":old_updating": {"BOOL": True},
        ":new_updating": {"BOOL": False},
    }

    for key in field_updates:
        if key != "orderStatus" and key != "updating":
            update_expression = f"{update_expression}, {key} = :{key}"
            expression_values[f":{key}"] = {
                "S": str(field_updates[key]),
            }

    try:
        dynamo.transact_write_items(
            TransactItems=[
                {
                    "Update": {
                        "Key": {
                            "id": {
                                "S": order_id,
                            },
                        },
                        "TableName": EnvironmentVariables.ORDER_STATUS_TABLE.value,
                        "UpdateExpression": update_expression,
                        "ConditionExpression": "orderStatus = :old_status AND updating = :old_updating",
                        "ExpressionAttributeValues": expression_values,
                    }
                },
            ],
        )
        return True
    except dynamo.exceptions.TransactionCanceledException:
        return False


def mark_order_status_updating(dynamo, order_id, expected_status):
    try:
        dynamo.transact_write_items(
            TransactItems=[
                {
                    "Update": {
                        "Key": {
                            "id": {
                                "S": order_id,
                            },
                        },
                        "TableName": EnvironmentVariables.ORDER_STATUS_TABLE.value,
                        "UpdateExpression": "SET updating = :new_updating",
                        "ConditionExpression": "orderStatus = :expected_status AND updating = :old_updating",
                        "ExpressionAttributeValues": {
                            ":expected_status": {
                                "S": expected_status,
                            },
                            ":old_updating": {"BOOL": False},
                            ":new_updating": {"BOOL": True},
                        },
                    }
                },
            ],
        )
        return True
    except dynamo.exceptions.TransactionCanceledException:
        return False


def send_order_update_task(
    dynamo, customer_id, order_id, old_status, new_status, field_updates, sqs=None
):
    if sqs is None:
        sqs = boto3.client("sqs")

    if field_updates is None:
        field_updates = {}

    message_body = {
        "customerId": customer_id,
        "orderId": order_id,
        "previousStatus": old_status,
        "newStatus": new_status,
        "fieldUpdates": field_updates,
    }

    print(
        f"Sending order status update task for customer {customer_id}'s order {order_id} with status {new_status}"
    )

    if not mark_order_status_updating(dynamo, order_id, old_status):
        return None
    return send_sqs_message(
        sqs, EnvironmentVariables.ORDER_UPDATE_QUEUE_URL.value, message_body
    )
