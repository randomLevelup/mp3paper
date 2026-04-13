#include <emscripten.h>
#include <cstdio>
#include "wasm_mp3paper.h"
#include "lame.h"

// suppress intellisense bull crap
#ifdef __INTELLISENSE__
#undef EMSCRIPTEN_KEEPALIVE
#define EMSCRIPTEN_KEEPALIVE
#endif

static Mp3StateEngine g_engine;

extern "C" {

EMSCRIPTEN_KEEPALIVE
void mp3_init(int sample_rate, int channels) {
    g_engine.init(sample_rate, channels);
}

EMSCRIPTEN_KEEPALIVE
void mp3_load_data(const uint8_t* pcm_data, size_t size) {
    g_engine.load_data(pcm_data, size);
}

EMSCRIPTEN_KEEPALIVE
void mp3_set_bitrate(int bitrate) {
    g_engine.set_bitrate(bitrate);
}

EMSCRIPTEN_KEEPALIVE
void mp3_encode(StepCallback cb) {
    g_engine.encode(cb);
}

EMSCRIPTEN_KEEPALIVE
void mp3_step_polyphase(StepCallback cb) {
    g_engine.step_polyphase(cb);
}

EMSCRIPTEN_KEEPALIVE
void mp3_step_psycho(StepCallback cb) {
    g_engine.step_psycho(cb);
}

EMSCRIPTEN_KEEPALIVE
void mp3_step_bitalloc(StepCallback cb) {
    g_engine.step_bitalloc(cb);
}

EMSCRIPTEN_KEEPALIVE
const uint8_t* mp3_get_result_data() {
    return g_engine.get_mp3_data();
}

EMSCRIPTEN_KEEPALIVE
size_t mp3_get_result_size() {
    return g_engine.get_mp3_size();
}

// Exposed buffer management for JS -> WASM copying
EMSCRIPTEN_KEEPALIVE
uint8_t* mp3_alloc_buffer(size_t size) {
    return static_cast<uint8_t*>(malloc(size));
}

EMSCRIPTEN_KEEPALIVE
void mp3_free_buffer(uint8_t* ptr) {
    free(ptr);
}

} // extern "C"
