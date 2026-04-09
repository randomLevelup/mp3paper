#include "wasm_mp3paper.h"

#include <algorithm>
#include <cstring>
#include <iostream>

Mp3StateEngine::Mp3StateEngine() : current_state_(Mp3State::IDLE), sample_rate_(44100), channels_(2), bitrate_(128), lame_ctx_(nullptr) {}

Mp3StateEngine::~Mp3StateEngine() {
    if (lame_ctx_) {
        lame_close(lame_ctx_);
        lame_ctx_ = nullptr;
    }
}

void Mp3StateEngine::init(int sample_rate, int channels) {
    sample_rate_ = sample_rate;
    channels_ = channels;
    
    if (lame_ctx_) {
        lame_close(lame_ctx_);
    }
    
    lame_ctx_ = lame_init();
    if (!lame_ctx_) {
        std::cout << "[WASM] Error: lame_init failed." << std::endl;
        current_state_ = Mp3State::ERROR_STATE;
        return;
    }
    
    lame_set_in_samplerate(lame_ctx_, sample_rate_);
    lame_set_num_channels(lame_ctx_, channels_);
    lame_set_brate(lame_ctx_, bitrate_);
    
    current_state_ = Mp3State::LAME_INITIALIZED;
    std::cout << "[WASM] LAME and Engine initialized. SR: " << sample_rate << ", Ch: " << channels << std::endl;
}

void Mp3StateEngine::load_data(const uint8_t* data, size_t size) {
    if (current_state_ != Mp3State::LAME_INITIALIZED && current_state_ != Mp3State::ENCODING_STARTED && current_state_ != Mp3State::FILE_LOADED) {
         std::cout << "[WASM] Warning: Cannot load data before LAME is initialized." << std::endl;
    }

    if (!lame_ctx_) {
        current_state_ = Mp3State::ERROR_STATE;
        std::cout << "[WASM] Error: LAME context unavailable." << std::endl;
        return;
    }
    
    size_t num_samples = size / sizeof(short);
    pcm_data_.assign(reinterpret_cast<const short*>(data), reinterpret_cast<const short*>(data) + num_samples);

    // Assuming interleaved data, total frames = total samples / channels
    lame_set_num_samples(lame_ctx_, num_samples / channels_);

    current_state_ = Mp3State::FILE_LOADED;
    std::cout << "[WASM] File data loaded. Size: " << size << " bytes, Samples: " << num_samples << "." << std::endl;
}

void Mp3StateEngine::set_bitrate(int bitrate) {
    bitrate_ = bitrate;
    if (lame_ctx_) {
        lame_set_brate(lame_ctx_, bitrate_);
    }
    std::cout << "[WASM] Bitrate set to: " << bitrate << " kbps." << std::endl;
}

void Mp3StateEngine::set_collection_config(int mode, int interval, int start, int max_frames) {
    collection_config_.mode = (mode == static_cast<int>(FrameCollectionMode::PERIODIC_INTERVAL))
        ? FrameCollectionMode::PERIODIC_INTERVAL
        : FrameCollectionMode::ALL_FRAMES;
    collection_config_.frame_interval = interval > 0 ? interval : 1;
    collection_config_.start_frame_index = start >= 0 ? start : 0;
    collection_config_.max_collected_frames = max_frames >= 0 ? max_frames : 0;
    std::cout << "[WASM] Collection config set: mode=" << mode << ", interval=" << interval << std::endl;
}

AnalysisFrameHeader Mp3StateEngine::convert_header(const mp3paper_analysis_frame_header_t& header) {
    AnalysisFrameHeader out{};
    out.frame_index = header.frame_index;
    out.collected_index = header.collected_index;
    out.granule_index = header.granule_index;
    out.channel_index = header.channel_index;
    out.block_type = header.block_type;
    out.band_count = header.band_count;
    out.time_seconds = header.time_seconds;
    return out;
}

void Mp3StateEngine::on_polyphase_record(void* user_data, const mp3paper_polyphase_record_t* record) {
    if (!user_data || !record) {
        return;
    }

    auto* engine = static_cast<Mp3StateEngine*>(user_data);
    PolyphaseFrameRecord out{};
    out.header = convert_header(record->header);
    std::memcpy(out.subband_magnitudes, record->subband_magnitudes, sizeof(out.subband_magnitudes));
    engine->analysis_data_.polyphase_records.push_back(out);
}

void Mp3StateEngine::on_psycho_record(void* user_data, const mp3paper_psycho_record_t* record) {
    if (!user_data || !record) {
        return;
    }

    auto* engine = static_cast<Mp3StateEngine*>(user_data);
    PsychoFrameRecord out{};
    out.header = convert_header(record->header);
    out.perceptual_entropy = record->perceptual_entropy;
    std::memcpy(out.band_energy, record->band_energy, sizeof(out.band_energy));
    std::memcpy(out.band_threshold, record->band_threshold, sizeof(out.band_threshold));
    engine->analysis_data_.psycho_records.push_back(out);
}

void Mp3StateEngine::on_bitalloc_record(void* user_data, const mp3paper_bitalloc_record_t* record) {
    if (!user_data || !record) {
        return;
    }

    auto* engine = static_cast<Mp3StateEngine*>(user_data);
    BitAllocFrameRecord out{};
    out.header = convert_header(record->header);
    out.target_bits = record->target_bits;
    out.part2_length = record->part2_length;
    out.part2_3_length = record->part2_3_length;
    out.total_bits = record->total_bits;
    out.reservoir_size = record->reservoir_size;
    out.reservoir_max = record->reservoir_max;
    std::memcpy(out.bits_per_band, record->bits_per_band, sizeof(out.bits_per_band));
    std::memcpy(out.smr, record->smr, sizeof(out.smr));
    engine->analysis_data_.bitalloc_records.push_back(out);
}

void Mp3StateEngine::encode(StepCallback cb) {
    if (current_state_ != Mp3State::FILE_LOADED) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: File not loaded or LAME not initialized.");
        return;
    }
    
    if (lame_init_params(lame_ctx_) < 0) {
        std::cout << "[WASM] Error: lame_init_params failed." << std::endl;
        current_state_ = Mp3State::ERROR_STATE;
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: lame_init_params failed.");
        return;
    }

    current_state_ = Mp3State::ENCODING_STARTED;

    analysis_data_ = EncodingAnalysisData{};
    analysis_data_.sampling = collection_config_;
    analysis_data_.sample_rate = sample_rate_;
    analysis_data_.channels = channels_;

    mp3paper_frame_collection_config_t native_config{};
    native_config.mode = (collection_config_.mode == FrameCollectionMode::PERIODIC_INTERVAL)
        ? MP3PAPER_COLLECTION_PERIODIC_INTERVAL
        : MP3PAPER_COLLECTION_ALL_FRAMES;
    native_config.frame_interval = collection_config_.frame_interval;
    native_config.start_frame_index = collection_config_.start_frame_index;
    native_config.max_collected_frames = collection_config_.max_collected_frames;

    mp3paper_analysis_callbacks_t callbacks{};
    callbacks.on_polyphase_record = &Mp3StateEngine::on_polyphase_record;
    callbacks.on_psycho_record = &Mp3StateEngine::on_psycho_record;
    callbacks.on_bitalloc_record = &Mp3StateEngine::on_bitalloc_record;

    mp3paper_analysis_context_t analysis_context{};
    mp3paper_analysis_context_init(&analysis_context, sample_rate_, channels_,
                                   &native_config, &callbacks, this);
    mp3paper_analysis_attach(lame_ctx_, &analysis_context);

    constexpr int kPcmChunkSamples = 1152;
    std::vector<unsigned char> mp3_buffer(8192);
    const int total_frames = static_cast<int>(pcm_data_.size() / static_cast<size_t>(channels_));
    int offset_frames = 0;
    int encode_status = 0;

    while (offset_frames < total_frames) {
        const int chunk_frames = std::min(kPcmChunkSamples, total_frames - offset_frames);

        if (channels_ == 2) {
            encode_status = lame_encode_buffer_interleaved(
                lame_ctx_,
                pcm_data_.data() + static_cast<size_t>(offset_frames) * channels_,
                chunk_frames,
                mp3_buffer.data(),
                static_cast<int>(mp3_buffer.size()));
        }
        else {
            encode_status = lame_encode_buffer(
                lame_ctx_,
                pcm_data_.data() + offset_frames,
                nullptr,
                chunk_frames,
                mp3_buffer.data(),
                static_cast<int>(mp3_buffer.size()));
        }

        if (encode_status < 0) {
            break;
        }

        offset_frames += chunk_frames;
    }

    if (encode_status >= 0) {
        encode_status = lame_encode_flush(lame_ctx_, mp3_buffer.data(), static_cast<int>(mp3_buffer.size()));
    }

    mp3paper_analysis_attach(lame_ctx_, nullptr);

    if (encode_status < 0) {
        current_state_ = Mp3State::ERROR_STATE;
        if (cb) cb(static_cast<int>(current_state_), "Error: encode failed.");
        return;
    }

    current_state_ = Mp3State::ENCODING_COMPLETE;

    analysis_data_.stats.total_frames_seen = analysis_context.stats.total_frames_seen;
    analysis_data_.stats.total_frames_collected = analysis_context.stats.total_frames_collected;
    analysis_data_.stats.polyphase_record_count = analysis_context.stats.polyphase_record_count;
    analysis_data_.stats.psycho_record_count = analysis_context.stats.psycho_record_count;
    analysis_data_.stats.bitalloc_record_count = analysis_context.stats.bitalloc_record_count;

    if (cb) cb(static_cast<int>(current_state_), "{\"status\":\"Encoding complete\"}");
}

static std::string serialize_header(const AnalysisFrameHeader& h) {
    return "\"frame_index\":" + std::to_string(h.frame_index) +
           ",\"collected_index\":" + std::to_string(h.collected_index) +
           ",\"granule_index\":" + std::to_string(h.granule_index) +
           ",\"channel_index\":" + std::to_string(h.channel_index) +
           ",\"block_type\":" + std::to_string(h.block_type) +
           ",\"band_count\":" + std::to_string(h.band_count) +
           ",\"time_seconds\":" + std::to_string(h.time_seconds);
}

void Mp3StateEngine::step_polyphase(StepCallback cb) {
    if (current_state_ != Mp3State::ENCODING_COMPLETE) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Encode not complete.");
        return;
    }
    current_state_ = Mp3State::POLYPHASE_COMPLETE;

    std::string json = "[";
    for (size_t i = 0; i < analysis_data_.polyphase_records.size(); ++i) {
        const auto& rec = analysis_data_.polyphase_records[i];
        json += "{" + serialize_header(rec.header) + ",\"subband_magnitudes\":[";
        for (int j = 0; j < kMp3PaperSubbandCount; ++j) {
            json += std::to_string(rec.subband_magnitudes[j]);
            if (j < kMp3PaperSubbandCount - 1) json += ",";
        }
        json += "]}";
        if (i < analysis_data_.polyphase_records.size() - 1) json += ",";
    }
    json += "]";

    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}

void Mp3StateEngine::step_psycho(StepCallback cb) {
    if (current_state_ != Mp3State::POLYPHASE_COMPLETE) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Polyphase step not ready.");
        return;
    }
    current_state_ = Mp3State::PSYCHO_COMPLETE;
    
    std::string json = "[";
    for (size_t i = 0; i < analysis_data_.psycho_records.size(); ++i) {
        const auto& rec = analysis_data_.psycho_records[i];
        json += "{" + serialize_header(rec.header) + ",\"perceptual_entropy\":" + std::to_string(rec.perceptual_entropy) + 
                ",\"band_energy\":[";
        for (int j = 0; j < kMp3PaperMaxScaleFactorBands; ++j) {
            json += std::to_string(rec.band_energy[j]);
            if (j < kMp3PaperMaxScaleFactorBands - 1) json += ",";
        }
        json += "],\"band_threshold\":[";
        for (int j = 0; j < kMp3PaperMaxScaleFactorBands; ++j) {
            json += std::to_string(rec.band_threshold[j]);
            if (j < kMp3PaperMaxScaleFactorBands - 1) json += ",";
        }
        json += "]}";
        if (i < analysis_data_.psycho_records.size() - 1) json += ",";
    }
    json += "]";

    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}

void Mp3StateEngine::step_bitalloc(StepCallback cb) {
    if (current_state_ != Mp3State::PSYCHO_COMPLETE) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Psycho step not ready.");
        return;
    }
    current_state_ = Mp3State::BITALLOC_COMPLETE;

    std::string json = "[";
    for (size_t i = 0; i < analysis_data_.bitalloc_records.size(); ++i) {
        const auto& rec = analysis_data_.bitalloc_records[i];
        json += "{" + serialize_header(rec.header) + 
                ",\"target_bits\":" + std::to_string(rec.target_bits) +
                ",\"part2_length\":" + std::to_string(rec.part2_length) +
                ",\"part2_3_length\":" + std::to_string(rec.part2_3_length) +
                ",\"total_bits\":" + std::to_string(rec.total_bits) +
                ",\"reservoir_size\":" + std::to_string(rec.reservoir_size) +
                ",\"reservoir_max\":" + std::to_string(rec.reservoir_max) +
                ",\"bits_per_band\":[";
        for (int j = 0; j < kMp3PaperMaxScaleFactorBands; ++j) {
            json += std::to_string(rec.bits_per_band[j]);
            if (j < kMp3PaperMaxScaleFactorBands - 1) json += ",";
        }
        json += "],\"smr\":[";
        for (int j = 0; j < kMp3PaperMaxScaleFactorBands; ++j) {
            json += std::to_string(rec.smr[j]);
            if (j < kMp3PaperMaxScaleFactorBands - 1) json += ",";
        }
        json += "]}";
        if (i < analysis_data_.bitalloc_records.size() - 1) json += ",";
    }
    json += "]";

    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}