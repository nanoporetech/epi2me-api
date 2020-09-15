mkdir protos

protoc -I ./epi2me-protobufs/ \
    --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
    --js_out=import_style=commonjs,binary:./protos/ \
    --ts_out="service=grpc-web:./protos"/ \
    ./epi2me-protobufs/*.proto
