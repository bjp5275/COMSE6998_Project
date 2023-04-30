#!/bin/bash

function usage {
        echo "Usage: $(basename $0) -d DIRECTORY -c [-s SUFFIX]"
        echo "  -d DIRECTORY: Directory where lambda_function.py exists"
        echo "                and optional requirements.txt"
        echo "  -c: Clean out previous packaged resources first"
        echo "  -s: Optionally override resource suffix on Lambda functions"
        exit 1
}

CLEAN_FIRST="false"
while getopts ":d:s:ch" arg; do
  case ${arg} in
    d)
      DIRECTORY=${OPTARG}
      ;;
    c)
      CLEAN_FIRST="true"
      ;;
    h)
      usage
      ;;
    s)
      SUFFIX=${OPTARG}
      ;;
  esac
done

if [ -z ${DIRECTORY+x} ]; then
    echo "ERROR: Must supply directory!"
    usage
elif [ ! -d "$DIRECTORY" ]; then
    echo "ERROR: Directory must exist!"
    usage
elif [ ! -f "${DIRECTORY}/lambda_function.py" ]; then
    echo "ERROR: Directory does not include lambda_function.py!"
    usage
fi

echo "Packaging ${DIRECTORY}..."
cd $DIRECTORY
BASENAME=`basename $(pwd)`
GIT_HASH=`git rev-parse --short HEAD`
PACKAGE_SUFFIX="${SUFFIX:-${GIT_HASH}}"
PACKAGE_NAME="${BASENAME}-${PACKAGE_SUFFIX}.zip"

if [ $CLEAN_FIRST == "true" ]; then
    echo "Cleaning directory..."
    rm -rf package/ ${BASENAME}-*.zip
fi

if [ -f "requirements.txt" ]; then
    echo "Installing requirements..."
    pip install --target ./package --requirement requirements.txt
    cd package
    zip -r ../${PACKAGE_NAME} .
    cd ..
else
    echo "No requirements to install"
fi

echo "Zipping lambda function..."
zip -j ${PACKAGE_NAME} ../project_utility.py
zip ${PACKAGE_NAME} lambda_function.py
cd ..

echo "Packaging complete!"
