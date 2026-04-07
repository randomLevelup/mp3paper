/**
 * @file wasm_mp3paper.h
 * @author Jupiter Westbard
 * @date 03/25/2026
 * @brief defs/headers for mp3paper
 */

#include <tuple>
#include <vector>
#include <cstdint>

#ifndef WASM_MP3PAPER_H
#define WASM_MP3PAPER_H

#include <tuple>
#include <vector>
#include <string>
#include <cstdint>
#include "lame.h"

// Payload Contracts for Visualization

struct PolyphasePayload {
    int frame_index;
    float subband_magnitudes[32];
};

struct PsychoPayload {
    int frame_index;
    float band_energy[32];
    float band_threshold[32];
    float perceptual_entropy;
};

struct BitAllocPayload {
    int frame_index;
    int bits_per_band[32];
    int total_bits;
    int reservoir_size;
    float smr[32];
};

enum class Mp3State {
    IDLE = 0,
    LAME_INITIALIZED,
    FILE_LOADED,
    ENCODING_STARTED,
    POLYPHASE_COMPLETE,
    PSYCHO_COMPLETE,
    BITALLOC_COMPLETE,
    ERROR_STATE
};

// Callback type for communicating results back to HTML
using StepCallback = void (*)(int state_code, const char* result_data);

class Mp3StateEngine {
public:
    Mp3StateEngine();
    ~Mp3StateEngine();

    void init(int sample_rate, int channels);
    void load_data(const uint8_t* data, size_t size);
    void set_bitrate(int bitrate);

    void encode(StepCallback cb);
    void step_polyphase(StepCallback cb);
    void step_psycho(StepCallback cb);
    void step_bitalloc(StepCallback cb);

    Mp3State get_current_state() const { return current_state_; }

private:
    Mp3State current_state_;
    int sample_rate_;
    int channels_;
    int bitrate_;
    std::vector<short> pcm_data_;
    lame_t lame_ctx_;
};

#endif
