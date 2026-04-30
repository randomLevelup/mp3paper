
# MP3: A Tour

*"Small is the new big...*

*If we can make your audio and video files smaller, we can make cancer smaller. And hunger. And AIDS."*

\- *Gavin Belson, Silicon Valley*

---

~Introduction~
## So You Think You Know MP3...

The MP3 format is one of those technologies that became so ordinary that it tends to slip beneath our notice because it works so well. For decades it has quietly trained entire generations to accept that most of what we hear can be discarded without consequence. CD-quality audio moves at about 1,411 kilobits per second; the standard 128 kbps MP3 reduces that to roughly one tenth the size \[2]. That reduction was enough to make online music exchange practical in the late 1990s, and the culture that formed around it was immense. It birthed (per se) AAC, which is the standard audio format for nearly every video format, static or streamed. If I were to list all the different ways MP3 is used today, I'd run out of disk space.

But how can data just be discarded without consequence? In the first section of this paper, I aim to describe the MP3 format by explaining the psychology that it employs. If you make it past the explanation, the subsequent [demonstration](#encode-a-file) section is an interactive exhibition of three critical steps in the encoding process, where you can upload an uncompressed (.wav) audio file and see what the MP3 algorithm is doing to compress your audio data.

In the latter sections I'll also include a brief history of audio recording technologies and the practice of *audio coding*, including the innovations behind *perceptual audio coding*. Finally, I'll expand the scope of the paper to speculative and philosophical horizons, contemplating the current ideologies surrounding lossy audio compression, as well as the future of encoding paradigms (i.e. AI-assisted compression).

A significant thesis is that the MP3 is a model example of a capitalist media form, one that revolves around discarding fidelity, context, and eventually history in the name of efficiency, convenience, and profit.

If you're curious, here's [the code](https://github.com/randomLevelup/mp3paper).

---

~Part One~
## Where'd My Data Go?

To understand the `.mp3` format, there are two concepts that you'll need to grasp first. They are, in order, *lossy compression* and *psychoacoustic masking*. The idea behind *lossy compression* is that, through some encoding process, the number of bits (ones and zeroes) needed to store a file can be *reduced*, such that the decoded data is not an exact recover of the original data, but is close enough that the human ear cannot tell the difference.

The second crucial concept, *psychoacoustic masking*, is a bit more esoteric. After all, it has 'psych' in its name. In short, psychoacoustic masking is a phenomenon wherein "louder sounds hide, i.e., 'mask', softer sounds in their spectral or temporal vicinity" \[3]. That is to say, masking causes us to lose track of the fainter sounds when a loud sound is introduced.  Certain signals are better maskers than others—white noise, for instance is an excellent masker. Part of the MP3 algorithm involves 'replacing' weaker signals with noise (random aperiodic signals). Interestingly, psychoacoustic masking is a primarily *neurological* phenomenon, meaning that when perceptual audio coding works properly, the algorithm is effectively tricking your brain into 'hearing' more sounds than are actually present.

Now that you're acquainted with the basic ideas of perceptual audio coding, I'll outline the actual steps that the MP3 encoder carries out. They are as follows:

1. Split the input signal into evenly-spaced *frequency bands*.
2. Analyze those bands to find which frequencies can be *masked* at different points in time.
3. Allocate an appropriate amount of *bits* to each band, depending on their *masking ratio*. This is called *quantization*.
4. Write all of the quantized bands *individually* to the output file.

As you might have noticed, the resulting `.mp3` file does *not* store a single stream of audio data. Rather, it stores a bunch of *streams* (39 to be exact) of data, where each stream represents a frequency band with masking and quantization applied. The frequencies are only ever recombined to a single stream when the file is opened and played.

Now let's see it in action:

---

~Part Two~
## Encode A File

In this section, I hope to supplement my explanation with an interactive demo of the MP3 algorithm, blown up step-by-step with helpful visualizations. The visualizations are three spectrograms (that is, time on the x-axis and frequency on the y-axis), generated from the actual data that exists in the computer's memory at three critical points in the encoding process. First, you'll need to upload an uncompressed audio file (in `.wav` format). Alternatively, the provided `.mp3` file is a 5-second clip of a simple tone.

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

As we know, sound waves propagate through air and interfere additively, such that every excitation of air from any source, no matter its strength, contributes to a single perceived stream of sound which is, "in short, a tumbled entanglement of the most different kinds of motion, complicated beyond conception" \[4, p. 26], to quote Hermann von Helmholtz' 1863 opus *Sensations of Tone*. Helmholtz was correct in declaring the mechanisms of wave composition *complicated*, though via the progression of his own work, and the nearly two centuries of science that succeeded it, the qualifier 'beyond conception' is proven hyperbole. You, dear reader, should know this, as you've already become an expert in psychoacoustic masking after reading the first couple sections of this paper. Now, we'll travel back to a time before computers, cassettes and vinyl; before even the gramophone was invented, and we'll trace the origins of our beloved MP3 format all the way up to the present day.

"The multiplicity of vibrational forms which can be thus produced by the composition of simple pendular vibrations is not merely extraordinarily great: it is so great that it cannot be greater" \[4, p. 34]. Before Helmholtz, sound studies (and music theory, by proxy) was largely a philosophical or mathematical exercise. Fourier proved in 1822 that any complex wave can be broken into simple sine waves. In 1843, Georg Ohm theorized that the ear performs Fourier analysis *intrinsically*. It wasn't until *Sensations of Tone* that this mechanism of human hearing was proven as fact.

By the late 19th century, the wave of industrial capitalism had begun to saturate the planet. The focus among corporations was on controlling the supply chain, massively scaling up manufacturing capabilities and crucially, *patenting* everything they could get their hands on. These three factors led to a surplus of *inventors* and *inventions*. During this time, acoustic-facing inventions were largely academic—the progress made was in *measurement*—tech like the Helmholtz resonator, the standardized tuning fork, and in 1877, the phonograph.

"Since a medium is a configuration of a variety of social forces, we would expect that, as the social field changes, the possibilities for the medium change as well. The phonograph's history illustrates this quite well" \[5], writes Jonathan Sterne in his history tome *The Audible Past*. During this time, the middle-class yearned for 'high culture,' and for domestic ways to show off their status to their friends. Having a piano in one's living room was a sign of great wealth and taste. It was only natural that the phonograph would find is place as a domestic amplifier of culture itself. The phonograph was the first major example of a widely distributed music-storage medium, 120 years before the MP3.

By the turn of the century, industrial capitalism was running full-tilt. The science taking place at the time was equally rampant, in academia but particularly among newfangled corporate cliques termed *Research and Development*. The telephone was popular by this time, thanks to Alexander Graham Bell, and several labs had sprung up around the U.S. to study and improve its mechanisms. The nascent *electrical components* industry provided psychoacoustics researchers with "plenty of sunshine and fertilizer to nurture their growth.... Perceptual coding descends from Bell's initial quest to squeeze more profit out of \[telephone\] infrastructure" \[6, p. 33].

The goal for the R&D labs at Bell, AT&T, Western Electric and the like was primarily to make the telephone more lucrative. They came to see that the surest way to improve the system was to study sound and hearing at a microscopic (to borrow an optics term) level. If they could pin down the smallest changes in sound that listeners could actually perceive, they could build a network that sounded clear while consuming as little current and bandwidth as possible \[6, p. 40]. The frequencies that were necessary for intelligible speech would need to be discovered and isolated from the ones that could be treated as surplus, to be repurposed and sold elsewhere. AT&T pursued that separation with new filtering and modulation techniques, while also borrowing methods from radio engineering when useful. To this day, the sensory affect of telephone speech bears the legacy of the improvements made by telephone companies in the 1920s \[6, p. 45].

By the second half of the twentieth century, perceptual coding had left the laboratory and became sort of an *industrial contest*. Digital audio broadcasting was one pressure point, and retail was equally pushy; manufacturers wanted codecs for discs, recorders, telecom lines, and the still-hazy future of interactive video. In 1998, the MPEG audio group was formed, mainly to prevent a market-destroying pileup of incompatible systems. By 1989 the group had received fourteen competing proposals from labs, telecom firms, broadcasters, chipmakers, and consumer-electronics companies spread across several countries \[6, p. 142]. One of the perceptual schemes, ASPEC, a collaboration among AT&T, The Fraunhofer Institute and France Telecom, supplied the core of what would become the MP3. By the early 1990s, Fraunhofer would go on to publish and commercialize MPEG-1 Audio Layer III, the official specification of the format. Thus, the MP3 was born as a negotiated standard, and defined a lasting compromise between sound quality, processing demands, compatibility, and corporate desire.

---

~Part Four~
## The Economy of Bitrate

"To consider the products of reproduction—original and copy—separate from the process, even in a philosophical exercise, is to confuse a commercially useful representation of reproduction with the ontological character of reproduced sound itself. 'Original' sounds are as much a product of the medium as are copies.... Sound reproduction is a social process" \[5]. In other words, a recording medium actively helps define what the sound is permitted to be. The MP3 is itself a social process that reshapes the music as an object of convenience, thus reshaping our expectations of what is worth consuming. In this section, we'll discuss the *sociopolitical* consequences of our collective adoption of MP3, primarily regarding the preservation of our own *audible past* via archive.

If the MP3 trained us to accept the loss of frequencies, the streaming economy has trained us to accept the loss of nearly everything else. Spotify's great triumph is *responsiveness*: the near-instant satisfaction of pressing play and hearing music back without (too much) delay \[7, p. 174]. This is accomplished, of course, via aggressive lossy compression. Today, convenience is a cultural virtue: under ordinary market conditions, and especially under financial pressure, most listeners choose the option that is cheap and frictionless, foregoing the richest format and the more comprehensive metadata.

"The dematerialization of music archives into streaming services shapes, but also is shaped by, the transnational drive for new markets by media companies like Spotify and Netflix to deliver catalog content to bigger consumer markets" \[7, p. 180]. Burkart discusses how archival institutions like UNESCO may want documentary heritage preserved in digital form, but modern platforms preserve only what fits their business model. The UNESCO gramophone archive depends on dense, expert metadata and multi-parameter indexing, while Spotify offers a much leaner, more saleable way of finding things; as Burkart puts it, the two are simply "incommensurable" \[7, p. 180]. However, society has collectively accepted a thinning of context: liner notes, object histories, release specificities, and other paratext that tell us what a recording *is* and where it came from.

And then there is the archive as a physical place. Old media do not digitize themselves; wax cylinders, shellac discs, tapes and rolls must be migrated by human labor over decades, usually under conditions of austerity \[7, p. 180]. Meanwhile, cutbacks narrow the public mission of archives and turn them effectively into glorified customer support centers instead of libraries. 100 years ago, industrial capitalism asked audio engineers how much sound could be discarded without provoking complaint. Today, platform capitalism asks archivists how much history can be discarded, flattened, or hidden before the client unsubscribes. In both cases, the answer is shaped by that which we may be pressured to tolerate in scarcity.

---

~Part Five~
## The Future of Encoding

The history of audio coding is a history of measurement, abstraction, and compromise: first the ear is analyzed, then sound is broken into parts, then industry decides which parts are worth the expense of preserving. Helmholtz and Ohm helped establish that hearing could be understood; Bell Labs treated that knowledge as infrastructure; Fraunhofer turned it into a standard; streaming platforms folded it into a business model. The MP3 sits in the middle of that history as a simple, though remarkably complex cultural artifact.

In the past decade, significant leaps in progress have been made regarding *neural* audio compression, wherein a computation paradigm called a *neural network* (the 'parent' of LLMs and contemporary generative AI) is leveraged to decrease the discrepancies (the 'loss' in ML terms) between the original signal and the compressed signal. In a 2022 paper from Meta AI, Alexandre Défossez presents "that a small Transformer model can be used to further reduce the bandwidth by up to 40% without further degradation of quality, in particular for applications where low latency is not essential (e.g. music streaming)" \[8, p. 10].

Soon, transformer-based neural codecs could cut bandwidth by another 40, or even 50 percent. However, the industry will not interpret that as permission to give us 40 percent more beauty. It will interpret it as permission to deliver the same media more cheaply, more quickly, and at greater scale. Let the MP3 then be a reminder that the industrial revolution's old logic can be applied to new domains, all in the name of *convenience*.


{footer}

References:

\[1]
T. Brock, “Articles of Incorporation,” _Silicon Valley_, Apr. 20, 2014.

\[2]
“30 Years of .mp3: Three Letters That Changed the World,” Fraunhofer Institute for Integrated Circuits IIS. Accessed: Apr. 16, 2026. \[Online]. Available: [https://www.iis.fraunhofer.de/en/magazin/panorama/2025/30-years-of-mp3.html](https://www.iis.fraunhofer.de/en/magazin/panorama/2025/30-years-of-mp3.html)

\[3]
J. Herre, S. Quackenbush, M. Kim, and J. Skoglund, “Perceptual Audio Coding: A 40-Year Historical Perspective,” in _ICASSP 2025-2025 IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)_, Apr. 2025, pp. 1-5. doi: [10.1109/ICASSP49660.2025.10887760](https://doi.org/10.1109/ICASSP49660.2025.10887760).

\[4]
H. von Helmholtz, _On the sensations of tone as a physiological basis for the theory of music_, Second English edition. New York: Dover Publications, 1954.

\[5]
J. Sterne, _The audible past: cultural origins of sound reproduction_. Durham: Duke University Press, 2003.

\[6]
J. Sterne, _MP3_. in The Meaning of a Format. Duke University Press, 2012. doi: [10.1515/9780822395522](https://doi.org/10.1515/9780822395522).

\[7]
P. Burkart and S. Leijonhufvud, “The Spotification of public service media,” _The Information Society_, vol. 35, no. 4, pp. 173–183, Aug. 2019, doi: [10.1080/01972243.2019.1613706](https://doi.org/10.1080/01972243.2019.1613706).

\[8]
A. Défossez, J. Copet, G. Synnaeve, and Y. Adi, “High Fidelity Neural Audio Compression,” Oct. 24, 2022, _arXiv_: arXiv:2210.13438. doi: [10.48550/arXiv.2210.13438](https://doi.org/10.48550/arXiv.2210.13438).
