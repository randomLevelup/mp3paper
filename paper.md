
# The MP3 Paper

*"I've been reading lips for 20 years... I'm a rock musician. I'm deaf. I can't hear what you're saying."*

*- Dave Grohl*

---

~Introduction~
## What Am I Saying?

Lossy compression... data discarded? Describe the mp3 format by *decoding* the psychology that it employs? Are there a certain group of people who we trust to define perceptibility? How has audio compression affected and been affected by both the economy of *data* and the economy of, well, money? As a supplement to my paper, I plan to code a compression demo blown up step-by-step with helpful visualizations.

If you're curious, here's [the code](https://github.com/randomLevelup/mp3paper).

---

~Part One~
## Demonstration

As a supplement to my paper, I plan to code a compression demo blown up step-by-step with helpful visualizations. I will include a bit of tech history and a bit of psych history as well.

"""
~Step One~
## Upload File

{{info:upload-status:No File Selected}}
{{button:Upload WAV}}
{{button:Use Example File}}

"""

Now you may adjust the bit-rate. Its like a quality slider. Choose your bit rate now!

"""
~Step Two~
## Adjust Bit Rate

{{slider:bitrate}}
{{info:bitrate-display:128 kbps}}

{{button:Encode}}

"""

"""
~Algorithm: Polyphase Filtering~
\
We run the data through a custom filterbank to divide the audio signal into 32 equal-width frequency subbands. The human ear has a limited resolution that can be expressed in terms of critical bandwidths less than 100Hz and more than 4kHz. Within a critical bandwidth the human ear blurs frequencies. Thus the filter bank creates equal-width frequency subbands that correlate to the critical bandwidths in a method diagrammed in the following figure. For the visualization, I want to show this subband split visually, but I also want to somehow incorporate stats from the actual conversion, so that the visualization is unique to the audio file.

{{hidden_button:btn-polyphase:Run}}
{{hidden_image:img-polyphase:testimage.svg}}

"""

"""
~Algorithm: Psychoacoustics Modeling~
\
Psychoacoustics has examined the concept of auditory masking and its effect on compression. Within each (critical) subband where blurring occurs the presence of a strong tonal signal can mask a region of weaker signals. For this card, we want to somehow visualize some of the results psychoacoustic analysis in a digestible way.

{{hidden_button:btn-psycho:Run}}
{{hidden_image:img-psycho:testimage.svg}}

"""

"""
~Algorithm: Bit Allocation~
\
Through an iterative algorithm, the bit allocation uses information from the psychoacoustic model to determine the number of code bits to be allocated to each subband. This process can be described using the following formula: MNRdB = SNRdB - SMRdB. For this visualization, we want to build off the psychoacoustics results and show which bands are getting more bits.

{{hidden_button:btn-bitalloc:Run}}
{{hidden_image:img-bitalloc:testimage.svg}}

"""

And now we know...

---

~Parts Two, Three etc.~
## The Actual Paper

*Actual paper pending...*
