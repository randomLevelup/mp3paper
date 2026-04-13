#ifndef LAME_MP3PAPER_ANALYSIS_INTERNAL_H
#define LAME_MP3PAPER_ANALYSIS_INTERNAL_H

#include "lame.h"
#include "machine.h"
#include "encoder.h"
#include "util.h"
#include "analysis.h"

#ifdef __cplusplus
extern "C" {
#endif

void mp3paper_analysis_begin_frame(lame_internal_flags* gfc, int frame_index);

void mp3paper_analysis_collect_polyphase(lame_internal_flags* gfc,
										 int granule_index,
										 int channel_index,
										 int block_type,
										 const float subband_magnitudes[MP3PAPER_SUBBAND_COUNT]);

void mp3paper_analysis_collect_psycho(lame_internal_flags* gfc,
									  int granule_index,
									  int channel_index,
									  int block_type,
									  const III_psy_ratio* ratio,
									  float perceptual_entropy);

void mp3paper_analysis_collect_bitalloc(lame_internal_flags* gfc,
										int granule_index,
										int channel_index,
										const gr_info* cod_info);

#ifdef __cplusplus
}
#endif

#endif

