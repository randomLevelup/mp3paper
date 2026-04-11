
~Introduction~
## So You Think You Know MP3...

In this paper, I aim to describe the mp3 format by decoding the psychology that it employs. I'll start with a brief history of audio recording technologies and the practice of *audio coding*, including the innovations behind *perceptual audio coding*. The subsequent [demonstration](#demonstration) section is an interactive exhibition of three critical steps in the mp3 algorithm, where you can upload an uncompressed (.wav) audio file and see the perceptual coding in action.

The latter sections (order TBD) expand the scope of the paper to more philosophical horizons, contemplating the *current* ideologies surrounding lossy audio compression, as well as the speculative future of coding paradigms (i.e. touching on AI-assisted compression).

If you're curious, here's [the code](https://github.com/randomLevelup/mp3paper).

---

~Part One~
## A Brief History

As we know, sound waves propagate through air and interfere additively, such that every excitation of air from any source, no matter its strength, contributes to a single perceived stream of sound which is, "in short, a tumbled entanglement of the most different kinds of motion, complicated beyond conception [2, p. 26]."

To be discussed:

- Hermann Helmholtz
- Bell's phonograph
- Edison's phonograph
- Bray and Wever's cat experiments
- Emergence of perceptual analysis and coding techniques

---

~Part Two~
## Demonstration

Helmholtz was correct in declaring the mechanisms of wave composition *complicated*, though via the progression of his own work, and the nearly two centuries of science that succeeded it, the qualifier 'beyond conception' is proven hyperbole. In this section, I hope to distill some of the wisdom attained in those years into an interactive demo of the mp3 algorithm, blown up step-by-step with helpful visualizations. The goal is to show the nature of the data that's being discarded, and the data that's being kept around.

"""
~Step One~
## Upload File

{{button:btn-upload:Upload WAV}}
{{button:btn-example:Use Example File}}
{{info:upload-status:No File Selected}}

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

We run the data through a custom filterbank to divide the audio signal into 32 equal-width frequency subbands. For the visualization, We show the subband split visually, alongside other stats from this step in the encoding process.

{{hidden_button:btn-polyphase:Run}}
{{info:info-polyphase:Waiting for Run...}}

"""

"""
~Algorithm: Psychoacoustics Modeling~

*Masking* is a primarily neurological phenomenon wherein "louder sounds hide, i.e., 'mask', softer sounds in their spectral or temporal vicinity" \[3]. That is to say, masking causes us to lose track of the fainter sounds when a loud sound is introduced. Certain signals are better maskers than others (white noise, for instance). As we'll cover, parts of the mp3 algorithm involve 'replacing' (for lack of a better term) existing audio data with noise (random aperiodic signals). This effect is essential for perceptual coding algorithms to work properly.

Psychoacoustics has examined the concept of auditory masking and its effect on compression. The human ear has 'critical subbands' where masking occurs more conspicuously. This visualization will show some of that subband analysis in a digestible way. In this step, each visualization should be quite unique to the audio file that we're encoding.

{{hidden_button:btn-psycho:Run}}
{{info:info-psycho:Waiting for Run...}}

"""

"""
~Algorithm: Bit Allocation~

The bit allocation uses information from the psychoacoustic model to determine the number of code bits to be allocated to each subband. This process can be described using the following formula: `MNRdB = SNRdB - SMRdB`. For this visualization, we want to build off the psychoacoustics results and show which bands are getting more bits.

{{hidden_button:btn-bitalloc:Run}}
{{info:info-bitalloc:Waiting for Run...}}

"""

"""
~Algorithm: Result~

Listen to the resulting mp3 file:

{{hidden_audio:audio-result:}}

"""

And now we know...

---

~Parts Three, Four etc.~
## Rest of the Paper

*paper pending...*

Subjects to discuss:

- Present condition of lossy audio compression
- Economy of bitrate: bandwidth limitations in some regions, popularity of streaming
- Future speculation for mp3 (i.e. AI-assisted compression)


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
