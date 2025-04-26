# Bluesky Stream Mapper for Italian Cities 

## Idea 
As Bluesky currently does not support tagging locations or adding coordinates to posts, let's just blindly use text references for geotagging the city names. 
Geonames provide a list of all Italian cities that we use here. 

## Result 
This map below, full of false positives like `Re` from e.g. `you're` or `Pero` from Italian or Spanish `pero` and many more. Sometimes you're lucky though and you actually get a match like Palermo in this run. 

![bluesky-italian-cities](https://github.com/user-attachments/assets/0f4d9d8a-bb36-423d-8170-200767f14c3b)

## Conclusion
Simple lexical matching is definitely not sufficient. 
It's a rabbit hole and I do not have the time to work on this repo more. What I'd eventually do if I had the time though, is to use a specialized NER model for addresses, pipe this string to Photon and use the resulting coordinate. 
It's probably just half a day of work but the problem is that running NER models over every post is quite expensive and would probably require modest hardware. Also, running it entirely in the frontent like we do here comes with some limitations until all NER models fully support WebGPU via transformers.js.

This app was inspired by a few apps I saw in the past months (can't remember the URLs but will add when I find them again).
