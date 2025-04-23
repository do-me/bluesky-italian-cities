// worker.js
importScripts('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js');

let locations = [];
let postQueue = [];
let isProcessingQueue = false;
let rateLimit = null; // Default rate limit is null (no limit)

self.addEventListener('message', async (event) => {
    const data = event.data;

    switch (data.type) {
        case 'loadLocations':
            try {
                const compressedData = new Uint8Array(data.compressedData); // Get the compressed data from the message
                const decompressedData = fflate.gunzipSync(compressedData);  // Decompress in the worker
                const text = new TextDecoder().decode(decompressedData);
                locations = JSON.parse(text);
                self.postMessage({ type: 'locationsLoaded' }); // Notify main thread
            } catch (error) {
                console.error('Error loading and parsing locations in worker:', error);
                self.postMessage({ type: 'error', message: 'Failed to load locations' });
            }
            break;

        case 'addPostToQueue':
            postQueue.push({ text: data.text, record: data.record });
            if (!isProcessingQueue) {
                processPostQueue();
            }
            break;

        case 'setRateLimit':
            rateLimit = data.rateLimit;
            break;
    }
});

async function processPostQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    let postsProcessedCount = 0; // Counter for posts processed in this batch

    while (postQueue.length > 0) {
        let postsToProcess;
        if (rateLimit) {
            postsToProcess = postQueue.splice(0, rateLimit); // Take 'rateLimit' number of posts
        } else {
            postsToProcess = postQueue.splice(0, postQueue.length); // Take all posts
        }

        for (const post of postsToProcess) {
            const locationResult = findLocationInText(post.text);
            self.postMessage({
                type: 'postProcessed',
                location: locationResult ? locationResult.location : null,
                matchedCity: locationResult ? locationResult.matchedCity : null,
                record: post.record,
                postsProcessed: ++postsProcessedCount // Increment and send count
            });
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    isProcessingQueue = false;
}

function escapeRegExp(string) {
    if (!string) {
        return '';
    }
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findLocationInText(text) {
    if (!locations || locations.length === 0) return null;

    let exactMatch = null;
    let nearbyMatch = null;
    let matchedCityName = null;

    for (const location of locations) {
        const escapedLocationName = escapeRegExp(location.name);

        // EXACT WORD MATCH (case-insensitive)
        const locationRegex = new RegExp(`\\b${escapedLocationName}\\b`, 'i');
        const match = locationRegex.exec(text);

        if (match) {
            exactMatch = location;
            matchedCityName = location.name;
            break; // Stop searching after the first exact match
        } else {
            // NEARBY WORD MATCH (case-insensitive, with word boundaries)
            const nearbyWords = ['near', 'close to', 'in the area of', 'at'];
            for (const word of nearbyWords) {
                const nearbyRegex = new RegExp(`\\b${word}\\s+\\b${escapedLocationName}\\b`, 'i'); // Added \\s+ for one or more spaces
                if (nearbyRegex.test(text)) {
                    nearbyMatch = location;
                    matchedCityName = location.name;
                    break; // Stop searching nearby words for this location
                }
            }
        }

        if (nearbyMatch) break; // Stop searching locations after a nearby match.
    }


    if (exactMatch) {
        return { location: exactMatch, matchedCity: matchedCityName };
    } else if (nearbyMatch) {
        return { location: nearbyMatch, matchedCity: matchedCityName };
    }

    return null;
}