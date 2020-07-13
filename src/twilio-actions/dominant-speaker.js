function updateDominantSpeaker(speaker) {
    const dominantSpeakerDiv = document.querySelector('div.dominant_speaker');
    if (dominantSpeakerDiv) {
        dominantSpeakerDiv.classList.remove('dominant_speaker');
    }
    if (speaker) {
        const newDominantSpeakerDiv = document.getElementById(speaker.sid);
        if (newDominantSpeakerDiv) {
        newDominantSpeakerDiv.classList.add('dominant_speaker');
        }
    }
}

function setupDominantSpeakerUpdates(room) {
    room.on('dominantSpeakerChanged', function(participant) {
        console.log('A new RemoteParticipant is now the dominant speaker:', participant);
        updateDominantSpeaker(participant);
    });
}

export default setupDominantSpeakerUpdates
