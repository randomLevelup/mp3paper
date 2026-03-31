#include <emscripten.h>
#include <cstdio>
#include <cstdint>

#include "lame.h"

// Global variables to store output dimensions
static int g_staticvar1 = 0;
static int g_staticvar2 = 0;
static lame_t g_lame = nullptr;


EMSCRIPTEN_KEEPALIVE
extern "C" uint8_t *examplefunc1(int x) {
    // Reset global dimensions at start
    g_staticvar1 = 0;
    g_staticvar2 = 0;

    // Reinitialize if there is a previously open encoder state.
    if (g_lame != nullptr) {
        lame_close(g_lame);
        g_lame = nullptr;
    }

    const int sample_rate = (x > 0) ? x : 44100;
    g_lame = lame_init();
    if (g_lame == nullptr) {
        fprintf(stderr, "lame_init failed\n");
        return nullptr;
    }

    lame_set_num_channels(g_lame, 2);
    lame_set_in_samplerate(g_lame, sample_rate);
    lame_set_brate(g_lame, 128);
    lame_set_quality(g_lame, 5);

    const int init_result = lame_init_params(g_lame);
    g_staticvar1 = sample_rate;
    g_staticvar2 = init_result;

    fprintf(stdout, "LAME %s init rc=%d, sr=%d\n", get_lame_short_version(), init_result, sample_rate);
    fflush(stdout);

    if (init_result < 0) {
        lame_close(g_lame);
        g_lame = nullptr;
    }

    return nullptr;
}

EMSCRIPTEN_KEEPALIVE
extern "C" void examplefunc2(uint8_t *data) {
    (void)data;

    if (g_lame != nullptr) {
        lame_close(g_lame);
        g_lame = nullptr;
        fprintf(stdout, "LAME encoder closed\n");
        fflush(stdout);
    }
}
