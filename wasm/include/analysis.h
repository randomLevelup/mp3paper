#ifndef MP3PAPER_ANALYSIS_H
#define MP3PAPER_ANALYSIS_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MP3PAPER_SUBBAND_COUNT 32
#define MP3PAPER_MAX_SFB 39

typedef struct {
	int frame_index;
	int collected_index;
	int granule_index;
	int channel_index;
	int block_type;
	int band_count;
	float time_seconds;
} mp3paper_analysis_frame_header_t;

typedef struct {
	mp3paper_analysis_frame_header_t header;
	float subband_magnitudes[MP3PAPER_SUBBAND_COUNT];
} mp3paper_polyphase_record_t;

typedef struct {
	mp3paper_analysis_frame_header_t header;
	float band_energy[MP3PAPER_MAX_SFB];
	float band_threshold[MP3PAPER_MAX_SFB];
	float perceptual_entropy;
} mp3paper_psycho_record_t;

typedef struct {
	mp3paper_analysis_frame_header_t header;
	int bits_per_band[MP3PAPER_MAX_SFB];
	float smr[MP3PAPER_MAX_SFB];
	int target_bits;
	int part2_length;
	int part2_3_length;
	int total_bits;
	int reservoir_size;
	int reservoir_max;
} mp3paper_bitalloc_record_t;

typedef struct {
	int total_frames_seen;
	int total_frames_collected;
	int polyphase_record_count;
	int psycho_record_count;
	int bitalloc_record_count;
} mp3paper_analysis_stats_t;

typedef struct {
	void (*on_polyphase_record)(void* user_data, const mp3paper_polyphase_record_t* record);
	void (*on_psycho_record)(void* user_data, const mp3paper_psycho_record_t* record);
	void (*on_bitalloc_record)(void* user_data, const mp3paper_bitalloc_record_t* record);
} mp3paper_analysis_callbacks_t;

typedef struct mp3paper_analysis_context {
	mp3paper_analysis_stats_t stats;
	int sample_rate;
	int channels;
	int current_frame_index;
	int current_collected_index;
	int current_frame_collect;
	float current_time_seconds;
	mp3paper_analysis_callbacks_t callbacks;
	void* user_data;
} mp3paper_analysis_context_t;

struct lame_global_struct;
struct lame_internal_flags;

void mp3paper_analysis_context_init(mp3paper_analysis_context_t* ctx,
									int sample_rate,
									int channels,
									void* reserved_config,
									const mp3paper_analysis_callbacks_t* callbacks,
									void* user_data);

void mp3paper_analysis_attach(struct lame_global_struct* gfp, mp3paper_analysis_context_t* ctx);

mp3paper_analysis_context_t* mp3paper_analysis_get(const struct lame_internal_flags* gfc);

void mp3paper_analysis_begin_frame(struct lame_internal_flags* gfc, int frame_index);
int mp3paper_analysis_should_collect(const struct lame_internal_flags* gfc);

#ifdef __cplusplus
}
#endif

#endif

