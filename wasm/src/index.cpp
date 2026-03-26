#include <emscripten.h>
#include <iostream>
#include <cstdio>
#include <cstring>

// Global variables to store output dimensions
static int g_staticvar1 = 0;
static int g_staticvar2 = 0;


EMSCRIPTEN_KEEPALIVE
extern "C" uint8_t *examplefunc1(int x) {
    // Reset global dimensions at start
    g_staticvar1 = 0;
    g_staticvar2 = 0;
    
    // Test printf output
    fprintf(stdout, "Printing...\n"); fflush(stdout);
    
    printf("Printting numbers: %dx%d...\n", width, height); fflush(stdout);
    return nullptr;
}

EMSCRIPTEN_KEEPALIVE
extern "C" void examplefunc2(uint8_t *data) {
    (void)data;
}
