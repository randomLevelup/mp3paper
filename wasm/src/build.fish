rm -f ../mp3paper.js ../mp3paper.wasm ../mp3paper.data ../mp3paper.worker.js

source /home/jupiter/emsdk/emsdk_env.fish

set LAME_SRC \
    lame/libmp3lame/VbrTag.c \
    lame/libmp3lame/bitstream.c \
    lame/libmp3lame/encoder.c \
    lame/libmp3lame/fft.c \
    lame/libmp3lame/gain_analysis.c \
    lame/libmp3lame/id3tag.c \
    lame/libmp3lame/lame.c \
    lame/libmp3lame/newmdct.c \
    lame/libmp3lame/presets.c \
    lame/libmp3lame/psymodel.c \
    lame/libmp3lame/quantize.c \
    lame/libmp3lame/quantize_pvt.c \
    lame/libmp3lame/reservoir.c \
    lame/libmp3lame/set_get.c \
    lame/libmp3lame/tables.c \
    lame/libmp3lame/takehiro.c \
    lame/libmp3lame/util.c \
    lame/libmp3lame/vbrquantize.c \
    lame/libmp3lame/version.c

set LAME_CFLAGS \
    -I ../../include -I lame/libmp3lame \
    -DSTDC_HEADERS=1 -DHAVE_ERRNO_H=1 -DHAVE_FCNTL_H=1 \
    -DHAVE_STDINT_H=1 -DHAVE_INTTYPES_H=1 -DHAVE_MEMCPY=1 -DHAVE_STRCHR=1 \
    -Dieee754_float32_t=float \
    -O3 -Wall -Wextra -Wpedantic -Wshadow \
    -Wno-unused-variable -Wno-unused-parameter -Wno-shift-negative-value -Wno-absolute-value -Wno-array-parameter

set LAME_OBJ
for src in $LAME_SRC
    set obj (string replace -r '\\.c$' '.o' $src)
    emcc -c $src -o $obj $LAME_CFLAGS
    or exit 1
    set LAME_OBJ $LAME_OBJ $obj
end

em++ index.cpp state_engine.cpp $LAME_OBJ -o ../mp3paper.js \
    -I ../../include -I lame/libmp3lame \
    -O3 -Wall -Wextra -Wpedantic -Wshadow \
    -s MODULARIZE=1 -s EXPORT_ES6=1 \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_malloc", "_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "addFunction", "removeFunction"]' \
    -s ALLOW_MEMORY_GROWTH=1 -s ALLOW_TABLE_GROWTH=1 \
    -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
    -s EXIT_RUNTIME=0 \
    -s ASSERTIONS=1
