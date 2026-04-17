
# The MP3 Paper

*"Small is the new big...*

*If we can make your audio and video files smaller, we can make cancer smaller. And hunger. And AIDS."*

\- *Gavin Belson, Silicon Valley*

---

~Introduction~
## So You Think You Know MP3...

The mp3 format is one of those technologies that became so ordinary that it tends to slip beneath our notice because it works so well. For decades it has quietly trained entire generations to accept that most of what we hear can be discarded without consequence. CD-quality audio moves at about 1,411 kilobits per second; the standard 128 kbps mp3 reduces that to roughly one tenth the size ("30 years of .mp3"). That reduction was enough to make online music exchange practical in the late 1990s, and the culture that formed around it was immense. It birthed (per se) AAC, which is the standard audio format for nearly every video format, static or streamed. If I were to list all the different ways mp3 is used today, I'd run out of disk space.

But how can data just be discarded without consequence? In the first section of this paper, I aim to describe the mp3 format by explaining the psychology that it employs. If you make it past the explanation, the subsequent [demonstration](#encode-a-file) section is an interactive exhibition of three critical steps in the encoding process, where you can upload an uncompressed (.wav) audio file and see what the mp3 algorithm is doing to compress your audio data.

In the latter sections (order TBD), I'll also include a brief history of audio recording technologies and the practice of *audio coding*, including the innovations behind *perceptual audio coding*. Finally, I'll expand the scope of the paper to more philosophical horizons, contemplating the *current* ideologies surrounding lossy audio compression, as well as the speculative future of coding paradigms (i.e. touching on AI-assisted compression).

My thesis (TBD) is something along the lines of: "the MP3 format is a prime example of capitalism at its most *fearsome*. We contrast progress for the sake of *science* with progress for the sake of *money*.

If you're curious, here's [the code](https://github.com/randomLevelup/mp3paper).

---

~Part One~
## Where'd My Data Go?

To understand the mp3 format, there are two concepts that you'll need to grasp first. They are, in order, *lossy compression* and *psychoacoustic masking*. The idea behind *lossy compression* is that, through some encoding process, the number of bits (ones and zeroes) needed to store a file can be *reduced*, such that the decoded data is not an exact recover of the original data, but is close enough that the human ear cannot tell the difference.

The second crucial concept, *psychoacoustic masking*, is a bit more esoteric. After all, it has 'psych' in its name. In short, psychoacoustic masking is a phenomenon wherein "louder sounds hide, i.e., 'mask', softer sounds in their spectral or temporal vicinity" (Sterne). That is to say, masking causes us to lose track of the fainter sounds when a loud sound is introduced.  Certain signals are better maskers than others—white noise, for instance is an excellent masker. Part of the mp3 algorithm involves 'replacing' weaker signals with noise (random aperiodic signals). Interestingly, psychoacoustic masking is a primarily *neurological* phenomenon, meaning that when perceptual audio coding works properly, the algorithm is effectively tricking your brain into 'hearing' more sounds than are actually present.

Now that you're acquainted with the basic ideas of perceptual audio coding, I'll outline the actual steps that the mp3 encoder carries out. They are as follows:

1. Split the input signal into evenly-spaced *frequency bands*.
2. Analyze those bands to find which frequencies can be *masked* at different points in time.
3. Allocate an appropriate amount of *bits* to each band, depending on their *masking ratio*. This is called *quantization*.
4. Write all of the quantized bands *individually* to the output file.

As you might have noticed, the resulting `.mp3` file does *not* store a single stream of audio data. Rather, it stores a bunch of *streams* (39 to be exact) of data, where each stream represents a frequency band with masking and quantization applied. The frequencies are only ever recombined to a single stream when the file is opened and played.

Now let's see it in action:

---

~Part Two~
## Encode A File

In this section, I hope to supplement my explanation with an interactive demo of the mp3 algorithm, blown up step-by-step with helpful visualizations. The visualizations are three spectrograms (that is, time on the x-axis and frequency on the y-axis), generated from the actual data that exists in the computer's memory at three critical points in the encoding process. First, you'll need to upload an uncompressed audio file (in `.wav` format). Alternatively, the provided mp3 file is a 5-second clip of a simple tone.

"""
~Step One~
## Upload File

{{button:btn-upload:Upload WAV}}
{{button:btn-example:Use Example File}}
{{info:upload-status:No File Selected}}

"""

Now you may adjust the bit-rate. This number determines the *compression ratio* of the encode. Smaller values mean more data will be discarded. Basically, it's like a quality slider. Choose your bit rate and click encode!

"""
~Step Two~
## Adjust Bit Rate

{{slider:bitrate}}
{{info:bitrate-display:128 kbps}}

{{button:btn-encode:Encode}}
{{info:info-encode:}}

"""

"""
~Algorithm - Step One - Polyphase Filtering~

The first step is to divide audio signal into 32 equal-width frequency bands. To do this, we use a mathematical object called a [filterbank](https://en.wikipedia.org/wiki/Filter_bank). For the visualization, We show the subband split visually, so you can see which bands appear to have more energy, upon initial analysis. In this step, the *timestep size* of the signal (effectively the resolution) is adjusted based on the bitrate, to a noticeable extent.

{{hidden_graph:graph-polyphase}}
{{hidden_button:btn-polyphase:Run}}

"""

"""
~Algorithm - Step Two - Psychoacoustic Masking~

As we know, masking causes us to lose track of the fainter sounds when a loud sound is introduced. Therefore, we can calculate optimal *masking ratios* for each frequency band over the course of the audio time.

This graph shows, for each moment in the file and each critical band, how much the encoder believes that band can be masked. Frequencies shaded teal are those the model considers more thoroughly maskable, meaning the encoder can be more aggressive there without expecting you to notice; bands shaded orange are less safely masked, which means they are more exposed, more perceptually important, and therefore more 'expensive' to compress.

The large gray region in the upper frequencies appears because the encoder uses a slightly modified band layout for this step. In ordinary, more stable passages it uses *long blocks*, which are ascribed a *constant* masking ratio and therefore have no values to display and are painted gray. The taller bars that occasionally rise through the gray appear when the encoder switches to *short blocks* or *mixed blocks*, usually because it has detected a moment that needs finer time resolution in order to avoid distortion. In those moments, fine psychoacoustic masking is applied to the upper frequencies as well, so the graph briefly fills in all the way upward.

{{hidden_graph:graph-psycho}}
{{hidden_button:btn-psycho:Run}}

"""

"""
~Algorithm - Step Three - Bit Allocation~

The final critical step, *bit allocation*, is where the encoder turns those psychoacoustic analysis results into actual compression decisions. In this graph, each square marks a frequency band at a particular moment in time. Larger squares indicate bands to which the encoder is devoting more *precision*, while smaller squares indicate bands it can afford to describe more crudely. In this graph, the color of the square reflects the raw energy of the band, so brighter, warmer squares tend to be bands where more acoustic activity is present.

The basic principle is this: The encoder has a limited budget of bits (determined by the [bitrate](#adjust-bit-rate)) for each moment of audio, and it cannot spend them equally everywhere. Bands that are loud, exposed, or difficult to hide generally receive more attention, because errors there are easier to hear. Bands that are quiet or strongly masked can be represented more cheaply.

{{hidden_graph:graph-bitalloc}}
{{hidden_button:btn-bitalloc:Run}}

"""

"""
~Algorithm - Result~

Now you can listen to the resulting mp3 file. Try to see if you can hear any distortion or compression artifacts!

{{hidden_audio:audio-result:}}
{{info:info-outfilesize}}

"""

Wonderful. Now [try again](#adjust-bit-rate) with a different bitrate.

---

~Part Three~
## A Brief History

As we know, sound waves propagate through air and interfere additively, such that every excitation of air from any source, no matter its strength, contributes to a single perceived stream of sound which is, "in short, a tumbled entanglement of the most different kinds of motion, complicated beyond conception" (Helmholtz 26). Helmholtz was correct in declaring the mechanisms of wave composition *complicated*, though via the progression of his own work, and the nearly two centuries of science that succeeded it, the qualifier 'beyond conception' is proven hyperbole. You, dear reader, should know this, as you've already become an expert in psychoacoustic masking after reading the first couple sections of this paper. Now, we'll travel back to a time before computers, cassettes and vinyl; before even the gramophone was invented, and we'll trace the origins of our beloved mp3 format all the way up to the present day. 

Proposed subjects in this section:

- Helmholtz' *Sensations of Tone*
- Bell's phonograph
- Edison's phonograph
- The industrial revolution
- Emergence of perceptual analysis and coding techniques

---

~Parts Four, Five etc.~
## Rest of the Paper

*paper pending...*

Subjects to discuss:

- Present condition of lossy audio compression
- Economy of bitrate: bandwidth limitations in some regions, popularity of streaming
- Future speculation for encoding (i.e. AI-assisted compression)


{footer}

References:

\[1]
T. Brock, “Articles of Incorporation,” _Silicon Valley_, Apr. 20, 2014.

\[2]
H. von Helmholtz, _On the sensations of tone as a physiological basis for the theory of music_, Second English edition. New York: Dover Publications, 1954.

\[3]
V. Lombardi, “Masking and Perceptual Coding,” Audio on The Internet. Accessed: Apr. 16, 2026. \[Online]. Available: [https://www.noisebetweenstations.com/personal/essays/audio_on_the_internet/MaskingPaper.html](https://www.noisebetweenstations.com/personal/essays/audio_on_the_internet/MaskingPaper.html)

\[4]
J. Sterne, _The audible past: cultural origins of sound reproduction_. Durham: Duke University Press, 2003.

\[5]
J. Sterne, _MP3_. in The Meaning of a Format. Duke University Press, 2012. doi: [10.1515/9780822395522](https://doi.org/10.1515/9780822395522).

\[6]
“30 Years of .mp3: Three Letters That Changed the World,” Fraunhofer Institute for Integrated Circuits IIS. Accessed: Apr. 16, 2026. \[Online]. Available: [https://www.iis.fraunhofer.de/en/magazin/panorama/2025/30-years-of-mp3.html](https://www.iis.fraunhofer.de/en/magazin/panorama/2025/30-years-of-mp3.html)
