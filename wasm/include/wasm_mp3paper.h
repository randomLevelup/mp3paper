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
#include "analysis.h"

inline constexpr int kMp3PaperSubbandCount = 32;
inline constexpr int kMp3PaperMaxScaleFactorBands = 39;

enum class FrameCollectionMode {
    ALL_FRAMES = 0,
    PERIODIC_INTERVAL,
};

struct FrameCollectionConfig {
    FrameCollectionMode mode = FrameCollectionMode::ALL_FRAMES;
    int frame_interval = 1;
    int start_frame_index = 0;
    int max_collected_frames = 0;
};

struct AnalysisFrameHeader {
    int frame_index = 0;
    int collected_index = 0;
    int granule_index = 0;
    int channel_index = 0;
    int block_type = 0;
    int band_count = 0;
    float time_seconds = 0.0f;
};

struct PolyphaseFrameRecord {
    AnalysisFrameHeader header{};
    float subband_magnitudes[kMp3PaperSubbandCount] = {};
};

struct PsychoFrameRecord {
    AnalysisFrameHeader header{};
    float band_energy[kMp3PaperMaxScaleFactorBands] = {};
    float band_threshold[kMp3PaperMaxScaleFactorBands] = {};
    float perceptual_entropy = 0.0f;
};

struct BitAllocFrameRecord {
    AnalysisFrameHeader header{};
    int bits_per_band[kMp3PaperMaxScaleFactorBands] = {};
    float smr[kMp3PaperMaxScaleFactorBands] = {};
    int target_bits = 0;
    int part2_length = 0;
    int part2_3_length = 0;
    int total_bits = 0;
    int reservoir_size = 0;
    int reservoir_max = 0;
};

struct AnalysisCollectionStats {
    int total_frames_seen = 0;
    int total_frames_collected = 0;
    int polyphase_record_count = 0;
    int psycho_record_count = 0;
    int bitalloc_record_count = 0;
};

struct EncodingAnalysisData {
    FrameCollectionConfig sampling{};
    int sample_rate = 0;
    int channels = 0;
    AnalysisCollectionStats stats{};
    std::vector<PolyphaseFrameRecord> polyphase_records;
    std::vector<PsychoFrameRecord> psycho_records;
    std::vector<BitAllocFrameRecord> bitalloc_records;
};

enum class Mp3State {
    IDLE = 0,
    LAME_INITIALIZED,
    FILE_LOADED,
    ENCODING_STARTED,
    ENCODING_COMPLETE,
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
    void set_collection_config(int mode, int interval, int start, int max_frames);

    void encode(StepCallback cb);
    void step_polyphase(StepCallback cb);
    void step_psycho(StepCallback cb);
    void step_bitalloc(StepCallback cb);

    Mp3State get_current_state() const { return current_state_; }

private:
    static AnalysisFrameHeader convert_header(const mp3paper_analysis_frame_header_t& header);
    static void on_polyphase_record(void* user_data, const mp3paper_polyphase_record_t* record);
    static void on_psycho_record(void* user_data, const mp3paper_psycho_record_t* record);
    static void on_bitalloc_record(void* user_data, const mp3paper_bitalloc_record_t* record);

    Mp3State current_state_;
    int sample_rate_;
    int channels_;
    int bitrate_;
    std::vector<short> pcm_data_;
    FrameCollectionConfig collection_config_{};
    EncodingAnalysisData analysis_data_{};
    lame_t lame_ctx_;
};

#endif
