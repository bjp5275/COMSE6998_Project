# Project - Coffee Delivery Service

Benjamin Pacifico (bjp2158)

## Repository Contents

| Directory | Purpose |
| :-------: | :-----: |
| [api](./api) | Contains the API Gateway Swagger YAML description for the application |
| [cloudformation](./cloudformation) | Contains the Cloudformation templates for the application |
| [front-end](./front-end) | Angular app for the UI |
| [lambda](./lambda) | All Lambda functions for the backend, accessed via API Gateway |

## Live Demo

Currently deployed to http://coffee-delivery-service-app-140519b0.s3-website-us-east-1.amazonaws.com.

*Note: URL is available via the Frontend's CloudFormation output value `WebsiteUrl` from the application stack.*

*Note: API is currently protected via an API key to prevent misuse. API key is available via API Gateway's console. See the API's Cloudformation `ApiKey` resource. Eventually, the goal is to protect the UI via Cognito.*

