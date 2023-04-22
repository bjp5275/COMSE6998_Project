import os
import json
import uuid
import boto3
from decimal import Decimal
from project_utility import (
    get_additions_by_id,
    get_query_parameter,
    build_response,
    deserialize_dynamo_object,
    serialize_to_dynamo_object,
    to_coffee_type_list,
    to_milk_type_list,
    COFFEE_TYPES,
    MILK_TYPES,
    validate_price,
)

# Dynamo Tables
PRODUCTS_TABLE = os.environ["PRODUCTS_TABLE"]

# Clients
dynamo = boto3.client("dynamodb")

# Constants
INCLUDE_DISABLED_FLAG = "includeDisabled"
PRODUCT_TYPE = "PRODUCT"
ADDITION_TYPE = "ADDITION"


def build_object_from_dynamo_response(items):
    objects = []
    for item in items:
        obj = deserialize_dynamo_object(item)
        obj.pop("_type")
        objects.append(obj)
    return objects


def get_products(event, context):
    # Base filter expression and values
    filterExpression = "#TYPE = :type"
    filterExpressionValues = {
        ":type": {
            "S": PRODUCT_TYPE,
        },
    }
    expressionNames = {"#TYPE": "_type"}

    # Check include_disabled flag
    include_disabled = (
        get_query_parameter(event, INCLUDE_DISABLED_FLAG, "false").lower() == "true"
    )

    # Filter out disabled items
    if not include_disabled:
        filterExpression = f"({filterExpression}) AND enabled = :enabled"
        filterExpressionValues[":enabled"] = {
            "BOOL": True,
        }

    print(
        f"Getting all products ({'including' if include_disabled else 'excluding'} disabled products)"
    )
    response = dynamo.scan(
        TableName=PRODUCTS_TABLE,
        FilterExpression=filterExpression,
        ExpressionAttributeNames=expressionNames,
        ExpressionAttributeValues=filterExpressionValues,
    )
    products = response["Items"]

    print(f"Found {len(products)} products")
    products = build_object_from_dynamo_response(products)
    all_additions = get_additions_by_id(dynamo, None)
    for product in products:
        if "allowedAdditions" in product:
            allowed_additions = []
            for id in product["allowedAdditions"]:
                if id in all_additions:
                    addition = all_additions[id]
                    if include_disabled or addition["enabled"]:
                        allowed_additions.append(all_additions[id])
            product["allowedAdditions"] = allowed_additions
    return build_response(200, products)


def create_product(product):
    validated_product = {"_type": PRODUCT_TYPE}

    if "id" in product and len(str(product["id"])) > 0:
        id = str(product["id"])
        print(f"Updating product {id}")
    else:
        id = str(uuid.uuid4())
        print(f"Creating product {id}", product)
    validated_product["id"] = id

    print("Validating product...")

    if "enabled" in product:
        validated_product["enabled"] = str(product["enabled"]).lower() == "true"
    else:
        validated_product["enabled"] = True

    if "name" in product:
        validated_product["name"] = str(product["name"])
    else:
        return False, None, "Product must have a name"

    if "basePrice" in product:
        base_price = validate_price(product["basePrice"])
        if base_price is None:
            return False, None, "Invalid base price"
        elif base_price <= 0:
            return False, None, "Base price must be non-negative"
        validated_product["basePrice"] = base_price
    else:
        return False, None, "Product must have a base price"

    if "imageUrl" in product:
        validated_product["imageUrl"] = str(product["imageUrl"])
    else:
        return False, None, "Product must have an image URL"

    if "allowedCoffeeTypes" in product:
        coffee_types, invalid_values = to_coffee_type_list(
            product["allowedCoffeeTypes"]
        )
        if len(invalid_values) > 0:
            return (
                False,
                None,
                f"Invalid coffee type(s): {', '.join(invalid_values)}. Known Types: {', '.join(COFFEE_TYPES)}",
            )
        elif len(coffee_types) == 0:
            return False, None, "Product must have at least one allowed coffee type"
        else:
            validated_product["allowedCoffeeTypes"] = coffee_types
    else:
        return False, None, "Product must have at least one allowed coffee type"

    if "allowedMilkTypes" in product:
        milk_types, invalid_values = to_milk_type_list(product["allowedMilkTypes"])
        if len(invalid_values) > 0:
            return (
                False,
                None,
                f"Invalid milk type(s): {', '.join(invalid_values)}. Known Types: {', '.join(MILK_TYPES)}",
            )
        elif len(milk_types) > 0:
            validated_product["allowedMilkTypes"] = milk_types

    if "allowedAdditions" in product:
        additions = product["allowedAdditions"]
        addition_ids = []
        for addition in additions:
            if "id" not in addition:
                return False, None, "All product additions must be identified by ID"
            addition_ids.append(addition["id"])

        addition_mapping = get_additions_by_id(dynamo, addition_ids)
        allowed_additions = []
        for id in addition_ids:
            if id not in addition_mapping:
                return False, None, f"Unknown product addition: {id}"
            allowed_additions.append(id)
        validated_product["allowedAdditions"] = allowed_additions

    print("Validated. Saving to Dynamo...", validated_product)

    dynamo.put_item(
        TableName=PRODUCTS_TABLE, Item=serialize_to_dynamo_object(validated_product)
    )

    print("Product saved")
    validated_product.pop("_type")
    return True, validated_product, id


def upsert_product(event, context):
    if "body" not in event or event["body"] is None:
        return build_response(400, "Must specify a request body")

    input_product = json.loads(event["body"], parse_float=Decimal)
    success, product, data = create_product(input_product)

    if success:
        return build_response(200, product)
    else:
        return build_response(400, data)


def lambda_handler(event, context):
    print(f"Received event: {event}")
    print(f"Context: {context}")

    httpMethod = event["httpMethod"]
    if httpMethod == "GET":
        response = get_products(event, context)
    elif httpMethod == "POST":
        response = upsert_product(event, context)
    else:
        response = build_response(500, f"Unknown method: {httpMethod}")

    print("Response", response)
    return response
