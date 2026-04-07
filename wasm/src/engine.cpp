#include "wasm_mp3paper.h"
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
    if (cb) cb(static_cast<int>(current_state_), "{\"status\":\"Encoding started\"}");
}

void Mp3StateEngine::step_polyphase(StepCallback cb) {
    if (current_state_ != Mp3State::ENCODING_STARTED) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Encode not started.");
        return;
    }
    current_state_ = Mp3State::POLYPHASE_COMPLETE;
    // TBD: Custom filterbank logic and generating visual stats
    std::string json = "{\"frame_index\":0, \"subband_magnitudes\":[";
    for(int i=0; i<32; ++i) {
        json += "0.0";
        if(i<31) json += ",";
    }
    json += "]}";
    
    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}

void Mp3StateEngine::step_psycho(StepCallback cb) {
    if (current_state_ != Mp3State::POLYPHASE_COMPLETE) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Polyphase step not ready.");
        return;
    }
    current_state_ = Mp3State::PSYCHO_COMPLETE;
    // TBD: Psychoacoustic modeling implementation
    std::string json = "{\"frame_index\":0, \"band_energy\":[], \"band_threshold\":[], \"perceptual_entropy\":0.0}";
    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}

void Mp3StateEngine::step_bitalloc(StepCallback cb) {
    if (current_state_ != Mp3State::PSYCHO_COMPLETE) {
        if (cb) cb(static_cast<int>(Mp3State::ERROR_STATE), "Error: Psycho step not ready.");
        return;
    }
    current_state_ = Mp3State::BITALLOC_COMPLETE;
    // TBD: Bit allocation logic
    std::string json = "{\"frame_index\":0, \"total_bits\":0, \"reservoir_size\":0, \"bits_per_band\":[], \"smr\":[]}";
    if (cb) cb(static_cast<int>(current_state_), json.c_str());
}