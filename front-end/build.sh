#!/bin/bash

rm -rf dist/

npm install

ng build --configuration=production

cd dist/front-end

zip -r ../coffee-delivery-service.zip .

cd ../..

