#include "mp3paper_analysis.h"

#include <string.h>

#include "encoder.h"
#include "lame_global_flags.h"

static mp3paper_analysis_frame_header_t
mp3paper_make_header(const lame_internal_flags* gfc,
					 const mp3paper_analysis_context_t* ctx,
					 int granule_index,
					 int channel_index,
					 int block_type,
					 int band_count)
{
	mp3paper_analysis_frame_header_t header;

	(void)gfc;

	memset(&header, 0, sizeof(header));
	header.frame_index = ctx->current_frame_index;
	header.collected_index = ctx->current_collected_index;
	header.granule_index = granule_index;
	header.channel_index = channel_index;
	header.block_type = block_type;
	header.band_count = band_count;
	header.time_seconds = ctx->current_time_seconds;
	header.sample_rate_hz = ctx->sample_rate;
	return header;
}

void
mp3paper_analysis_context_init(mp3paper_analysis_context_t* ctx,
							   int sample_rate,
							   int channels,
							   void* reserved_config,
							   const mp3paper_analysis_callbacks_t* callbacks,
							   void* user_data)
{
	(void)reserved_config;

	if (ctx == NULL) {
		return;
	}

	memset(ctx, 0, sizeof(*ctx));

	if (callbacks != NULL) {
		ctx->callbacks = *callbacks;
	}

	ctx->sample_rate = sample_rate;
	ctx->channels = channels;
	ctx->current_frame_index = -1;
	ctx->current_collected_index = -1;
	ctx->current_frame_collect = 0;
	ctx->current_time_seconds = 0.0f;
	ctx->user_data = user_data;
}

void
mp3paper_analysis_attach(lame_global_flags* gfp, mp3paper_analysis_context_t* ctx)
{
	if (gfp == NULL || gfp->internal_flags == NULL) {
		return;
	}
	gfp->internal_flags->mp3paper_analysis = ctx;
}

mp3paper_analysis_context_t*
mp3paper_analysis_get(const lame_internal_flags* gfc)
{
	if (gfc == NULL) {
		return NULL;
	}
	return gfc->mp3paper_analysis;
}

void
mp3paper_analysis_begin_frame(lame_internal_flags* gfc, int frame_index)
{
	float frame_samples;
	mp3paper_analysis_context_t* ctx = mp3paper_analysis_get(gfc);

	if (ctx == NULL) {
		return;
	}

	ctx->stats.total_frames_seen++;
	ctx->current_frame_index = frame_index;
	frame_samples = (float)(576 * gfc->cfg.mode_gr);
	if (ctx->sample_rate > 0) {
		ctx->current_time_seconds = (float)(frame_index * frame_samples / ctx->sample_rate);
	}
	else {
		ctx->current_time_seconds = 0.0f;
	}

	ctx->current_frame_collect = 1;
	if (ctx->current_frame_collect) {
		ctx->current_collected_index = ctx->stats.total_frames_collected;
		ctx->stats.total_frames_collected++;
	}
}

void
mp3paper_analysis_collect_polyphase(lame_internal_flags* gfc,
									int granule_index,
									int channel_index,
									int block_type,
									const float subband_energy[MP3PAPER_SUBBAND_COUNT])
{
	mp3paper_polyphase_record_t record;
	mp3paper_analysis_context_t* ctx = mp3paper_analysis_get(gfc);

	if (ctx == NULL || !ctx->current_frame_collect || ctx->callbacks.on_polyphase_record == NULL) {
		return;
	}

	memset(&record, 0, sizeof(record));
	record.header = mp3paper_make_header(gfc, ctx, granule_index, channel_index, block_type,
										 MP3PAPER_SUBBAND_COUNT);
	memcpy(record.subband_energy, subband_energy, sizeof(record.subband_energy));

	ctx->callbacks.on_polyphase_record(ctx->user_data, &record);
	ctx->stats.polyphase_record_count++;
}

void
mp3paper_analysis_collect_psycho(lame_internal_flags* gfc,
								 int granule_index,
								 int channel_index,
								 int block_type,
								 const III_psy_ratio* ratio,
								 float perceptual_entropy)
{
	int i;
	int win;
	int idx;
	int band_count;
	mp3paper_psycho_record_t record;
	mp3paper_analysis_context_t* ctx = mp3paper_analysis_get(gfc);

	if (ctx == NULL || !ctx->current_frame_collect || ctx->callbacks.on_psycho_record == NULL || ratio == NULL) {
		return;
	}

	memset(&record, 0, sizeof(record));

	if (block_type == SHORT_TYPE) {
		if (gfc->l3_side.tt[granule_index][channel_index].mixed_block_flag) {
			idx = 0;
			for (i = 0; i < 8 && idx < MP3PAPER_MAX_SFB; ++i, ++idx) {
				record.band_energy[idx] = ratio->en.l[i];
				record.band_threshold[idx] = ratio->thm.l[i];
			}
			for (i = 3; i < SBMAX_s && idx < MP3PAPER_MAX_SFB; ++i) {
				for (win = 0; win < 3 && idx < MP3PAPER_MAX_SFB; ++win, ++idx) {
					record.band_energy[idx] = ratio->en.s[i][win];
					record.band_threshold[idx] = ratio->thm.s[i][win];
				}
			}
			band_count = idx;
		}
		else {
			idx = 0;
			for (i = 0; i < SBMAX_s && idx < MP3PAPER_MAX_SFB; ++i) {
				for (win = 0; win < 3 && idx < MP3PAPER_MAX_SFB; ++win, ++idx) {
					record.band_energy[idx] = ratio->en.s[i][win];
					record.band_threshold[idx] = ratio->thm.s[i][win];
				}
			}
			band_count = idx;
		}
	}
	else {
		band_count = SBMAX_l;
		if (band_count > MP3PAPER_MAX_SFB) {
			band_count = MP3PAPER_MAX_SFB;
		}
		for (i = 0; i < band_count; ++i) {
			record.band_energy[i] = ratio->en.l[i];
			record.band_threshold[i] = ratio->thm.l[i];
		}
	}

	record.header = mp3paper_make_header(gfc, ctx, granule_index, channel_index, block_type,
										 band_count);
	record.perceptual_entropy = perceptual_entropy;

	ctx->callbacks.on_psycho_record(ctx->user_data, &record);
	ctx->stats.psycho_record_count++;
}

void
mp3paper_analysis_collect_bitalloc(lame_internal_flags* gfc,
								   int granule_index,
								   int channel_index,
								   const gr_info* cod_info)
{
	int i;
	int band_count;
	mp3paper_bitalloc_record_t record;
	mp3paper_analysis_context_t* ctx = mp3paper_analysis_get(gfc);

	if (ctx == NULL || !ctx->current_frame_collect || ctx->callbacks.on_bitalloc_record == NULL || cod_info == NULL) {
		return;
	}

	memset(&record, 0, sizeof(record));
	band_count = cod_info->sfbmax;
	if (band_count < 0) {
		band_count = 0;
	}
	if (band_count > MP3PAPER_MAX_SFB) {
		band_count = MP3PAPER_MAX_SFB;
	}

	for (i = 0; i < band_count; ++i) {
		record.bits_per_band[i] = cod_info->scalefac[i] > 0 ? cod_info->scalefac[i] : 0;
		record.smr[i] = 0.0f;
	}

	record.header = mp3paper_make_header(gfc, ctx, granule_index, channel_index,
										 cod_info->block_type, band_count);
	record.target_bits = cod_info->part2_length + cod_info->part2_3_length;
	record.part2_length = cod_info->part2_length;
	record.part2_3_length = cod_info->part2_3_length;
	record.total_bits = cod_info->part2_length + cod_info->part2_3_length;
	record.reservoir_size = gfc->sv_enc.ResvSize;
	record.reservoir_max = gfc->sv_enc.ResvMax;

	ctx->callbacks.on_bitalloc_record(ctx->user_data, &record);
	ctx->stats.bitalloc_record_count++;
}

