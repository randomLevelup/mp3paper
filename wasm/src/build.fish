rm ../circlegen*

source /home/jupiter/emsdk/emsdk_env.fish

em++ index.cpp -o ../circlegen.js \
     -I ../../include -I ../../include/eigen3 \
     -O3 -Wall -Wextra -Wpedantic -Wshadow \
     -s MODULARIZE=1 -s EXPORT_ES6=1 \
     -s WASM=1 \
     -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_examplefunc1", "_examplefunc2"]' \
     -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPU8"]' \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
     -s EXIT_RUNTIME=0 \
     -s ASSERTIONS=1
