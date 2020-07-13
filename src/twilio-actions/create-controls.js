const UserControls = function() {
    const currentUserControls = document.createElement('div');
    currentUserControls.classList.add('usercontrol');
    
    const title = document.createElement('h6');
    title.appendChild(document.createTextNode(creds.identity));
    currentUserControls.appendChild(title);
    const muteBtn = createButton('Mute', currentUserControls);
    muteBtn.onclick = function() {
    const mute = muteBtn.innerHTML == 'Mute';
    const localUser = room.localParticipant;
    getTracks(localUser).forEach(function(track) {
        if (track.kind === 'audio') {
        if (mute) {
            track.disable();
        } else {
            track.enable();
        }
        }
    });
    muteBtn.innerHTML = mute ? 'Unmute' : 'Mute';
    }
    muteBtn.style.display = 'none';
    userControls.appendChild(currentUserControls);
}

export default UserControls