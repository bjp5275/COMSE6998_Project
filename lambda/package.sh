#!/bin/bash

function usage {
        echo "Usage: $(basename $0) -d DIRECTORY -c"
        echo "  -d DIRECTORY: Directory where lambda_function.py exists"
        echo "                and optional requirements.txt"
        echo "  -c: Clean out previous packaged resources first"
        exit 1
}

CLEAN_FIRST="false"
while getopts ":d:ch" arg; do
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

if [ $CLEAN_FIRST == "true" ]; then
    echo "Cleaning directory..."
    rm -rf package/ deployment.zip
fi

if [ -f "requirements.txt" ]; then
    echo "Installing requirements..."
    pip install --target ./package --requirement requirements.txt
    cd package
    zip -r ../deployment.zip .
    cd ..
else
    echo "No requirements to install"
fi

echo "Zipping lambda function..."
zip -j deployment.zip ../project_utility.py
zip deployment.zip lambda_function.py
cd ..

echo "Packaging complete!"
