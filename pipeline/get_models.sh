#!/bin/sh
# Downloads the two model files the pipeline needs into pipeline/models (about 250 MB).
# Both come from the projects' own GitHub release pages.
set -e
cd "$(dirname "$0")"
mkdir -p models
curl -L -o models/yoloe-11l-seg-pf.pt https://github.com/ultralytics/assets/releases/download/v8.3.0/yoloe-11l-seg-pf.pt
curl -L -o models/isnet-general-use.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
echo "Models are in pipeline/models"
