
# The MP3 Paper

*"Small is the new big.... If we can make your audio and video files smaller, we can make cancer smaller. And hunger. And AIDS."*

*- Gavin Belson, Silicon Valley*

---

~Introduction~
## So You Think You Know MP3...

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
{{button:btn-upload:Upload WAV}}
{{button:btn-example:Use Example File}}

"""

Now you may adjust the bit-rate. Its like a quality slider. Choose your bit rate now!

"""
~Step Two~
## Adjust Bit Rate

{{slider:bitrate}}
{{info:bitrate-display:128 kbps}}

{{button:btn-encode:Encode}}

"""

"""
~Algorithm: Polyphase Filtering~
\
We run the data through a custom filterbank to divide the audio signal into 32 equal-width frequency subbands. The human ear has a limited resolution that can be expressed in terms of critical bandwidths less than 100Hz and more than 4kHz. Within a critical bandwidth the human ear blurs frequencies. Thus the filter bank creates equal-width frequency subbands that correlate to the critical bandwidths in a method diagrammed in the following figure. For the visualization, I want to show this subband split visually, but I also want to somehow incorporate stats from the actual conversion, so that the visualization is unique to the audio file.

{{hidden_button:btn-polyphase:Run}}
{{info:info-polyphase:Waiting for Run...}}

"""

"""
~Algorithm: Psychoacoustics Modeling~
\
Psychoacoustics has examined the concept of auditory masking and its effect on compression. Within each (critical) subband where blurring occurs the presence of a strong tonal signal can mask a region of weaker signals. For this card, we want to somehow visualize some of the results psychoacoustic analysis in a digestible way.

{{hidden_button:btn-psycho:Run}}
{{info:info-psycho:Waiting for Run...}}

"""

"""
~Algorithm: Bit Allocation~
\
Through an iterative algorithm, the bit allocation uses information from the psychoacoustic model to determine the number of code bits to be allocated to each subband. This process can be described using the following formula: MNRdB = SNRdB - SMRdB. For this visualization, we want to build off the psychoacoustics results and show which bands are getting more bits.

{{hidden_button:btn-bitalloc:Run}}
{{info:info-bitalloc:Waiting for Run...}}

"""

And now we know...

---

~Parts Two, Three etc.~
## Rest of the Paper

*paper pending...*


{footer}

References:

\[1]
T. Brock, “Articles of Incorporation,” _Silicon Valley_, Apr. 20, 2014.


\[2]
H. von Helmholtz, _On the sensations of tone as a physiological basis for the theory of music_, Second English edition. New York: Dover Publications, 1954.


\[3]
J. Herre, S. Quackenbush, M. Kim, and J. Skoglund, “Perceptual Audio Coding: A 40-Year Historical Perspective,” in _ICASSP 2025 - 2025 IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)_, Apr. 2025, pp. 1–5. doi: [10.1109/ICASSP49660.2025.10887760](https://doi.org/10.1109/ICASSP49660.2025.10887760).


\[4]
I. V. McLoughlin, Ed., “Psychoacoustics,” in _Speech and Audio Processing: A MATLAB®-based Approach_, Cambridge: Cambridge University Press, 2016, pp. 109–139. doi: [10.1017/CBO9781316084205.007](https://doi.org/10.1017/CBO9781316084205.007).


\[5]
J. Sterne, _The audible past: cultural origins of sound reproduction_. Durham: Duke University Press, 2003.
