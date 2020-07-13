export default function getTracks(participant) {
    return Array.from(participant.tracks.values()).filter(function(publication) {
        return publication.track;
    }).map(function(publication) {
        return publication.track;
    });
}